import axios from 'axios';
import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import PropTypes from 'prop-types';
import { calculateTradeDetails, prepareRateChartData, prepareInterestChartData } from '../utils/tradeAnalytics';

ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,BarElement,Title,Tooltip,Legend);

function TradeDetailsModal({ tradeId, onClose }) {
  const [trade, setTrade] = useState(null);
  const [rateChanges, setRateChanges] = useState([]);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // form states
  const [qty, setQty] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg,setSuccessMsg]=useState('');

  useEffect(()=>{
    // load rate changes from localStorage
    try{
      const stored = localStorage.getItem('cbRateChanges');
      if(stored) setRateChanges(JSON.parse(stored));
    }catch(e){console.error(e);} 
  },[]);

  useEffect(()=>{
    if(!tradeId) return;
    const load=async()=>{
      setLoading(true);
      try{
        const resp=await axios.get(`/api/trades/${tradeId}`);
        setTrade(resp.data);
        const calc=calculateTradeDetails(resp.data, rateChanges);
        setDetails(calc);
      }catch(e){setError('Ошибка загрузки');}
      finally{setLoading(false);}  
    };
    load();
  },[tradeId, rateChanges]);

  const handlePartialClose=async()=>{
    if(!qty||!exitPrice) return;
    setSaving(true);
    try{
      const payload={quantity:Number(qty), exitPrice:Number(exitPrice)};
      if(exitDate) payload.exitDate=exitDate;
      if(notes) payload.notes=notes;
      await axios.post(`/api/trades/${tradeId}/close-part`, payload);
      setSuccessMsg('Частичное закрытие сохранено');
      window.dispatchEvent(new CustomEvent('tradesUpdated', {detail:{source:'modal'}}));
      setQty('');setExitPrice('');setExitDate('');setNotes('');
      onClose();
    }catch(e){setError(e.response?.data?.message||'Ошибка сохранения');}
    finally{setSaving(false);}  
  };

  const chartOptions={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false,grid:{display:false},ticks:{color:'#9ca3af',font:{size:10}}},x:{grid:{display:false},ticks:{color:'#9ca3af',font:{size:10}}}}};

  if(!tradeId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
      {/* modal */}
      <div className="relative z-10 w-full max-w-2xl animate-scale-in">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
          {loading && <div>Загрузка...</div>}
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {details && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">{details.trade.symbol}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {/* KPI */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center"><div className="text-2xl font-light text-gray-800">{details.daysHeld}</div><div className="text-xs text-gray-400">дней удержания</div></div>
                <div className="text-center"><div className="text-2xl font-light text-blue-500">{details.currentRate}%</div><div className="text-xs text-gray-400">текущая ставка</div></div>
                <div className="text-center"><div className="text-2xl font-light text-red-500">₽{Math.round(details.totalInterest).toLocaleString()}</div><div className="text-xs text-gray-400">накоплено процентов</div></div>
                <div className="text-center"><div className="text-2xl font-light text-green-500">₽{Math.round(details.savingsFromRateChanges).toLocaleString()}</div><div className="text-xs text-gray-400">экономия от ЦБ</div></div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="w-full max-w-[520px] mx-auto">
                  <h6 className="text-sm font-medium text-gray-700 mb-2">Динамика ставки</h6>
                  <div className="h-56"><Line data={prepareRateChartData(details)} options={chartOptions} /></div>
                </div>
                <div className="w-full max-w-[520px] mx-auto">
                  <h6 className="text-sm font-medium text-gray-700 mb-2">Проценты по периодам</h6>
                  <div className="h-56"><Bar data={prepareInterestChartData(details)} options={chartOptions} /></div>
                </div>
              </div>

              {/* Periods table */}
              <div className="mb-6">
                <h6 className="text-lg font-medium text-gray-700 mb-3">Детализация периодов</h6>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="py-1 text-left">Период</th><th className="py-1 text-left">Дни</th><th className="py-1 text-left">Ставка</th><th className="py-1 text-left">Проценты</th></tr></thead>
                  <tbody>
                    {details.periods.map((p,idx)=>(
                      <tr key={idx} className="border-t">
                        <td className="py-1">{format(new Date(p.startDate),'dd.MM.yy',{locale:ru})} – {format(new Date(p.endDate),'dd.MM.yy',{locale:ru})}</td>
                        <td className="py-1">{p.days}</td>
                        <td className="py-1"><span className="inline-block px-1 py-0.5 rounded bg-gray-100 text-gray-600">{p.rate}%</span></td>
                        <td className="py-1 text-red-600">₽{Math.round(p.interest).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Partial close form */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h6 className="text-sm font-medium text-gray-700 mb-3">Закрыть часть позиции</h6>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3 text-sm">
                  <input type="number" min="1" placeholder="Кол-во" value={qty} onChange={e=>setQty(e.target.value)} className="border rounded px-2 py-1" />
                  <input type="number" step="0.01" placeholder="Цена выхода" value={exitPrice} onChange={e=>setExitPrice(e.target.value)} className="border rounded px-2 py-1" />
                  <input type="date" value={exitDate} onChange={e=>setExitDate(e.target.value)} className="border rounded px-2 py-1" />
                  <input type="text" placeholder="Заметка" value={notes} onChange={e=>setNotes(e.target.value)} className="border rounded px-2 py-1" />
                </div>
                <div className="mt-6 flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={handlePartialClose}
                    disabled={saving || !qty || !exitPrice}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Закрыть часть
                  </button>
                  <button
                    onClick={async()=>{
                      const price=prompt('Введите цену выхода для полного закрытия');
                      if(!price) return;
                      try{
                        await axios.post(`/api/trades/${tradeId}/sell`, null,{params:{exitPrice:price}});
                        window.dispatchEvent(new CustomEvent('tradesUpdated',{detail:{source:'modal'}}));
                        onClose();
                      }catch(e){alert('Ошибка закрытия');}
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500"
                  >
                    Закрыть сделку
                  </button>
                  <button
                    onClick={async()=>{
                      if(!confirm('Удалить сделку?')) return;
                      try{
                        await axios.delete(`/api/trades/${tradeId}`);
                        window.dispatchEvent(new CustomEvent('tradesUpdated',{detail:{source:'modal'}}));
                        onClose();
                      }catch(e){alert('Ошибка удаления');}
                    }}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-400"
                  >
                    Удалить
                  </button>
                </div>
                {successMsg && <div className="text-green-600 text-xs mt-2">{successMsg}</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
TradeDetailsModal.propTypes={tradeId:PropTypes.number,onClose:PropTypes.func};
export default TradeDetailsModal; 