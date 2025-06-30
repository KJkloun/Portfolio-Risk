DROP TABLE IF EXISTS spot_src;
CREATE LINKED TABLE spot_src('org.h2.Driver', 'jdbc:h2:file:./backend/data/portfoliodb', 'sa', 'password', 'spot_transactions');
INSERT INTO spot_transactions (amount, company, note, portfolio_id, price, quantity, ticker, trade_date, transaction_type)
SELECT amount, company, note, 2, price, quantity, ticker, trade_date, transaction_type FROM spot_src;
DROP TABLE spot_src; 