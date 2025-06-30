import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Table, 
  Button, 
  Badge, 
  Form,
  Modal,
  Alert,
  Spinner,
  Nav
} from 'react-bootstrap';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DEFAULT_INTEREST_RATE = 22.0;
const MAX_TRADES_TO_LOAD = 50;
const CHART_COLORS = {
  primary: 'rgb(75, 192, 192)',
  primaryBackground: 'rgba(75, 192, 192, 0.2)',
  secondary: 'rgba(59, 130, 246, 1)',
  secondaryBackground: 'rgba(59, 130, 246, 0.1)',
};

const formatCurrency = (amount) => {
  return amount.toLocaleString('ru-RU', { 
    style: 'currency', 
    currency: 'RUB',
    maximumFractionDigits: 0 
  });
};

const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

const getCurrentDateString = () => new Date().toISOString().split('T')[0];

const InterestRateManager = () => {
  const { t } = useTranslation();
  
  const [trades, setTrades] = useState([]);
  const [extendedTradesInfo, setExtendedTradesInfo] = useState({});
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [newRate, setNewRate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(getCurrentDateString());
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [showOverallView, setShowOverallView] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getCurrentDateString());
  const [selectedTradeIds, setSelectedTradeIds] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRate, setBulkRate] = useState('');
  const [bulkDate, setBulkDate] = useState(getCurrentDateString());
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'month', 'entry'

  const fetchTrades = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:8081/api/trades');
      setTrades(response.data || []);
      setError('');
    } catch (error) {
      setError('Ошибка загрузки сделок');
      setTrades([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const loadExtendedInfoForTrades = useCallback(async (tradeIds) => {
    try {
      const limitedIds = tradeIds.slice(0, MAX_TRADES_TO_LOAD);

      const promises = limitedIds.map(async (id) => {
    try {
          const response = await axios.get(`http://localhost:8081/api/trades/${id}/extended-info`);
          return { id, data: response.data };
    } catch (error) {
          return { id, data: null };
    }
      });
      
      const results = await Promise.all(promises);
      
      const infoMap = {};
      results.forEach(({ id, data }) => {
        if (data) {
          infoMap[id] = data;
        }
      });
      
      setExtendedTradesInfo(prev => ({
        ...prev,
        ...infoMap
      }));
    } catch (error) {
      console.error('Error loading extended info:', error);
    }
  }, []);

  useEffect(() => {
    if (trades.length > 0) {
      const openTrades = trades.filter(trade => !trade.exitDate);
      loadExtendedInfoForTrades(openTrades.map(trade => trade.id));
    }
  }, [trades, loadExtendedInfoForTrades]);

  const getOverallStatistics = () => {
    const openTrades = trades.filter(trade => !trade.exitDate);
    
    if (openTrades.length === 0) {
      return {
        totalDailyPayment: 0,
        totalAccumulatedInterest: 0,
        averageRate: 0,
        totalInvestments: 0,
        positionCount: 0,
        loadingProgress: 100
      };
    }

    let totalDailyPayment = 0;
    let totalAccumulatedInterest = 0;
    let totalInvestments = 0;
    let weightedRateSum = 0;
    let tradesWithExtendedInfo = 0;

    openTrades.forEach(trade => {
      const extendedInfo = extendedTradesInfo[trade.id];
      const position = Number(trade.entryPrice) * trade.quantity;
      totalInvestments += position;
      
      if (extendedInfo) {
        tradesWithExtendedInfo++;
        const dailyPayment = extendedInfo.dailyInterestAmount || 0;
        const accumulatedInterest = extendedInfo.totalInterestWithVariableRate || 0;
        
        totalDailyPayment += dailyPayment;
        totalAccumulatedInterest += accumulatedInterest;
        
        const currentRate = trade.marginAmount || DEFAULT_INTEREST_RATE;
        weightedRateSum += currentRate * position;
      } else {
        const rate = trade.marginAmount || DEFAULT_INTEREST_RATE;
        const dailyPayment = position * rate / 100 / 365;
        
        weightedRateSum += rate * position;
        totalDailyPayment += dailyPayment;
      }
    });

    const averageRate = totalInvestments > 0 ? (weightedRateSum / totalInvestments) : 0;
    const loadingProgress = Math.round((tradesWithExtendedInfo / openTrades.length) * 100);

    return {
      totalDailyPayment: roundToTwoDecimals(totalDailyPayment),
      totalAccumulatedInterest: roundToTwoDecimals(totalAccumulatedInterest),
      averageRate: roundToTwoDecimals(averageRate),
      totalInvestments: roundToTwoDecimals(totalInvestments),
      positionCount: openTrades.length,
      loadingProgress
    };
  };

  const changeInterestRate = async (tradeId, newRate, effectiveDate) => {
    try {
      setLoading(true);
      await axios.post(`http://localhost:8081/api/trades/${tradeId}/change-interest-rate`, {
        newRate: parseFloat(newRate),
        effectiveDate
      });
      
      // Refresh trades and extended info
      await fetchTrades();
      setError('');
    } catch (error) {
      setError(`Ошибка изменения ставки: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRateChange = async () => {
    if (!bulkRate || selectedTradeIds.length === 0) {
      setError('Выберите сделки и укажите новую ставку');
      return;
    }

    try {
      setLoading(true);
      await axios.post('http://localhost:8081/api/trades/change-interest-rate-bulk', {
        tradeIds: selectedTradeIds,
        newRate: parseFloat(bulkRate),
        effectiveDate: bulkDate
      });
      
      setSelectedTradeIds([]);
      setBulkRate('');
      setShowBulkModal(false);
      await fetchTrades();
      setError('');
    } catch (error) {
      setError(`Ошибка массового изменения ставок: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getOverallRatesChartData = () => {
    const openTrades = trades.filter(trade => !trade.exitDate);
        
    if (openTrades.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const averageRates = last7Days.map(date => {
      let totalWeight = 0;
      let weightedSum = 0;

      openTrades.forEach(trade => {
        const position = Number(trade.entryPrice) * trade.quantity;
        const rate = trade.marginAmount || DEFAULT_INTEREST_RATE;
        
        totalWeight += position;
        weightedSum += rate * position;
      });

      return totalWeight > 0 ? roundToTwoDecimals(weightedSum / totalWeight) : 0;
    });

    return {
      labels: last7Days.map(date => new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Средневзвешенная ставка (%)',
        data: averageRates,
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.primaryBackground,
        tension: 0.3,
          fill: true,
        pointBackgroundColor: CHART_COLORS.primary,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  };

  const getDailyExpensesChartData = () => {
    const openTrades = trades.filter(trade => !trade.exitDate);
    
    if (openTrades.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const dailyExpenses = last30Days.map(date => {
      let totalExpense = 0;

      openTrades.forEach(trade => {
        const extendedInfo = extendedTradesInfo[trade.id];
        if (extendedInfo && extendedInfo.dailyInterestAmount) {
          totalExpense += extendedInfo.dailyInterestAmount;
        } else {
          const position = Number(trade.entryPrice) * trade.quantity;
          const rate = trade.marginAmount || DEFAULT_INTEREST_RATE;
          totalExpense += position * rate / 100 / 365;
        }
      });
      
      return roundToTwoDecimals(totalExpense);
    });
    
    return {
      labels: last30Days.map(date => new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Ежедневные расходы (₽)',
        data: dailyExpenses,
        borderColor: CHART_COLORS.secondary,
        backgroundColor: CHART_COLORS.secondaryBackground,
        tension: 0.3,
          fill: true,
        pointBackgroundColor: CHART_COLORS.secondary,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        border: {
          display: false
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const getGroupedTrades = () => {
    const openTrades = trades.filter(trade => !trade.exitDate);
    
    if (groupBy === 'none') {
      return { 'Все сделки': openTrades };
    }
    
    if (groupBy === 'month') {
      const grouped = {};
      openTrades.forEach(trade => {
        const month = new Date(trade.entryDate).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' });
        if (!grouped[month]) grouped[month] = [];
        grouped[month].push(trade);
      });
      return grouped;
    }
    
    if (groupBy === 'entry') {
      const grouped = {};
      openTrades.forEach(trade => {
        const priceRange = `${Math.floor(trade.entryPrice / 10) * 10}-${Math.floor(trade.entryPrice / 10) * 10 + 10} ₽`;
        if (!grouped[priceRange]) grouped[priceRange] = [];
        grouped[priceRange].push(trade);
      });
      return grouped;
    }
    
    return { 'Все сделки': openTrades };
  };

  const TradeDetails = ({ trade, extendedInfo, onRateChange }) => {
    const [editRate, setEditRate] = useState(trade.marginAmount || '');
    const [editDate, setEditDate] = useState(getCurrentDateString());
    const [isEditing, setIsEditing] = useState(false);

    const handleRateChange = () => {
      if (editRate && editDate) {
        onRateChange(trade.id, editRate, editDate);
        setIsEditing(false);
      }
    };

    const rateHistory = trade.interestRateHistory ? 
      JSON.parse(trade.interestRateHistory).slice(-5) : [];

    return (
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
          <div>
            <h6 className="mb-0">{trade.symbol}</h6>
            <small className="text-muted">{trade.quantity} акций по {trade.entryPrice} ₽</small>
        </div>
          <Badge bg={trade.marginAmount > 20 ? 'danger' : 'warning'}>
            {trade.marginAmount || DEFAULT_INTEREST_RATE}%
          </Badge>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <div className="mb-2">
                <strong>Позиция:</strong> {formatCurrency(trade.entryPrice * trade.quantity)}
          </div>
              <div className="mb-2">
                <strong>Дата входа:</strong> {new Date(trade.entryDate).toLocaleDateString('ru-RU')}
          </div>
              {extendedInfo && (
                <>
                  <div className="mb-2">
                    <strong>Дневная оплата:</strong> 
                    <span className="text-danger ms-1">
                      {formatCurrency(extendedInfo.dailyInterestAmount || 0)}
                    </span>
          </div>
                  <div className="mb-2">
                    <strong>Накопленные проценты:</strong> 
                    <span className="text-danger ms-1">
                      {formatCurrency(extendedInfo.totalInterestWithVariableRate || 0)}
                    </span>
                </div>
                </>
              )}
            </Col>
            <Col md={6}>
              {isEditing ? (
                <Form>
                  <Form.Group className="mb-2">
                    <Form.Label>Новая ставка (%)</Form.Label>
                    <Form.Control
                type="number"
                      value={editRate}
                      onChange={(e) => setEditRate(e.target.value)}
                step="0.01"
              />
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Label>Дата применения</Form.Label>
                    <Form.Control
                type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  </Form.Group>
                  <div className="d-flex gap-2">
                    <Button size="sm" variant="primary" onClick={handleRateChange}>
                      Сохранить
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>
                      Отмена
                    </Button>
            </div>
                </Form>
              ) : (
                <Button size="sm" variant="outline-primary" onClick={() => setIsEditing(true)}>
                  Изменить ставку
                </Button>
              )}
              
              {rateHistory.length > 0 && (
                <div className="mt-3">
                  <h6>История ставок:</h6>
                  <div style={{ height: '200px', width: '100%' }}>
                    <Line
                      data={{
                        labels: rateHistory.map(item => 
                          new Date(item.date).toLocaleDateString('ru-RU')
                        ),
                        datasets: [{
                          label: 'Ставка (%)',
                          data: rateHistory.map(item => item.rate),
                          borderColor: CHART_COLORS.primary,
                          backgroundColor: CHART_COLORS.primaryBackground,
                          tension: 0.3,
                          pointRadius: 4
                        }]
                      }}
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: { display: false }
                        }
                      }}
                    />
          </div>
        </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  const statistics = getOverallStatistics();
  const groupedTrades = getGroupedTrades();

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">Управление процентными ставками</h2>
          <p className="text-muted">Мониторинг и управление ставками по открытым позициям</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Nav variant="pills" className="mb-4">
        <Nav.Item>
          <Nav.Link 
            active={showOverallView} 
                onClick={() => setShowOverallView(true)}
              >
            <i className="fas fa-chart-line me-2"></i>
                Общий обзор
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={!showOverallView} 
                onClick={() => setShowOverallView(false)}
          >
            <i className="fas fa-list me-2"></i>
            Детальный просмотр
          </Nav.Link>
        </Nav.Item>
      </Nav>

        {showOverallView ? (
        <>
          {/* Statistics Cards */}
          <Row className="mb-4">
            <Col lg={3} md={6} className="mb-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <div className="text-danger mb-2">
                    <i className="fas fa-money-bill-wave fa-2x"></i>
                  </div>
                  <h3 className="text-danger mb-1">
                    {formatCurrency(statistics.totalDailyPayment)}
                  </h3>
                  <p className="text-muted mb-0 small">Дневная оплата</p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <div className="text-warning mb-2">
                    <i className="fas fa-chart-line fa-2x"></i>
                  </div>
                  <h3 className="text-warning mb-1">
                    {formatCurrency(statistics.totalAccumulatedInterest)}
                  </h3>
                  <p className="text-muted mb-0 small">Накопленные проценты</p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <div className="text-primary mb-2">
                    <i className="fas fa-chart-bar fa-2x"></i>
                </div>
                  <h3 className="text-primary mb-1">{statistics.averageRate}%</h3>
                  <p className="text-muted mb-0 small">Средняя ставка</p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={3} md={6} className="mb-3">
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center">
                  <div className="text-success mb-2">
                    <i className="fas fa-briefcase fa-2x"></i>
              </div>
                  <h3 className="text-success mb-1">{statistics.positionCount}</h3>
                  <p className="text-muted mb-0 small">Открытые позиции</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Charts */}
          <Row className="mb-4">
            <Col md={6} className="mb-4">
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Динамика ставок (7 дней)</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '300px' }}>
                    <Line data={getOverallRatesChartData()} options={chartOptions} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className="mb-4">
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white">
                  <h5 className="mb-0">Ежедневные расходы (30 дней)</h5>
                </Card.Header>
                <Card.Body>
                  <div style={{ height: '300px' }}>
                    <Line data={getDailyExpensesChartData()} options={chartOptions} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
                    ) : (
        <>
          {/* Controls */}
          <Row className="mb-4">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Группировка</Form.Label>
                <Form.Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                  <option value="none">Без группировки</option>
                  <option value="month">По месяцам входа</option>
                  <option value="entry">По диапазонам цены входа</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6} className="d-flex align-items-end">
              <Button 
                variant="primary" 
                      onClick={() => setShowBulkModal(true)}
                disabled={selectedTradeIds.length === 0}
              >
                <i className="fas fa-edit me-2"></i>
                Массовое изменение ({selectedTradeIds.length})
              </Button>
            </Col>
          </Row>

          {/* Trades List */}
          {Object.entries(groupedTrades).map(([groupName, groupTrades]) => (
            <div key={groupName} className="mb-4">
              {Object.keys(groupedTrades).length > 1 && (
                <h5 className="mb-3">{groupName} ({groupTrades.length})</h5>
              )}
              
              {groupTrades.length > 0 ? (
                <Row>
                  <Col md={4}>
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-white">
                        <h6 className="mb-0">Сделки</h6>
                      </Card.Header>
                      <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {groupTrades.map(trade => (
                          <div
                            key={trade.id}
                            className={`p-2 mb-2 border rounded cursor-pointer ${
                              selectedTradeId === trade.id ? 'bg-primary text-white' : 'bg-light'
                            }`}
                            onClick={() => setSelectedTradeId(trade.id)}
                          >
                            <Form.Check
                          type="checkbox"
                              checked={selectedTradeIds.includes(trade.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                                  setSelectedTradeIds([...selectedTradeIds, trade.id]);
                            } else {
                                  setSelectedTradeIds(selectedTradeIds.filter(id => id !== trade.id));
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="float-end"
                            />
                            <div className="fw-bold">{trade.symbol}</div>
                            <small>{trade.quantity} × {trade.entryPrice} ₽</small>
                        <div>
                              <Badge bg={trade.marginAmount > 20 ? 'danger' : 'warning'}>
                                {trade.marginAmount || DEFAULT_INTEREST_RATE}%
                              </Badge>
                        </div>
                        </div>
                        ))}
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={8}>
                    {selectedTradeId && (
                <TradeDetails 
                        trade={groupTrades.find(t => t.id === selectedTradeId)}
                        extendedInfo={extendedTradesInfo[selectedTradeId]}
                  onRateChange={changeInterestRate}
                />
                    )}
                  </Col>
                </Row>
              ) : (
                <Card className="border-0 shadow-sm">
                  <Card.Body className="text-center text-muted">
                    Нет открытых сделок в этой группе
                  </Card.Body>
                </Card>
              )}
            </div>
          ))}
        </>
        )}

      {/* Bulk Change Modal */}
      <Modal show={showBulkModal} onHide={() => setShowBulkModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Массовое изменение ставок</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Изменить ставку для {selectedTradeIds.length} выбранных сделок</p>
          <Form.Group className="mb-3">
            <Form.Label>Новая ставка (%)</Form.Label>
            <Form.Control
                  type="number"
                  value={bulkRate}
                  onChange={(e) => setBulkRate(e.target.value)}
              step="0.01"
              placeholder="Введите новую ставку"
                />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Дата применения</Form.Label>
            <Form.Control
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBulkModal(false)}>
                    Отмена
          </Button>
          <Button variant="primary" onClick={handleBulkRateChange} disabled={loading}>
            {loading ? <Spinner size="sm" className="me-2" /> : null}
            Применить изменения
          </Button>
        </Modal.Footer>
      </Modal>

      {isLoading && (
        <div className="d-flex justify-content-center mt-4">
          <Spinner animation="border" />
          </div>
        )}
    </Container>
  );
};

export default InterestRateManager; 