import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { sql } from './config/db.js';

dotenv.config();

const app = express();
app.use(cors());
//database connection; 
const connectDBInit = async () => {
  try {
    await sql`CREATE TABLE IF NOT EXISTS transaction(
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      category VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`
    console.log('Database initialize successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1); 
  }
}
//middlewre
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//routes;
app.get('/api/transaction/:userId', async(req, res, next) => {
  try {
    const { userId } = req.params;
    const transactions = await sql`
      SELECT * FROM transaction WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Internal Server Error' });
    
  }
})
app.post('/api/transaction', async(req, res) => {
  try {
    const {title, amount, category, user_id} = req.body;
    if(!title || !category || !user_id || amount === undefined){
      return res.status(404).json({ message: 'Please provide all required fields' });
    }

    const transaction = await sql`
      INSERT INTO transaction (user_id, title, amount, category)
      VALUES (${user_id}, ${title}, ${amount}, ${category})
      RETURNING *
    `;

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction: transaction[0] 
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.delete('/api/transaction/:id', async(req, res) => {
  try {
    const { id } = req.params;
    const transactions = await sql`
      DELETE FROM transaction WHERE id = ${id} RETURNING *
    `;
    res.status(200).json({
      message: 'Transaction deleted successfully',
      transaction: transactions[0]
    })
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Internal Server Error' });
    
  }
})

app.get('/api/transaction/summary/:userId', async(req, res) => {
  try {
    const {userId} = req.params;
    const balancedResult = await sql`
      SELECT COALESCE(sum(amount), 0) AS balance FROM transaction WHERE user_id = ${userId}
    `;
    const incomeResult = await sql`
      SELECt COALESCE(sum(amount), 0) AS income FROM transaction WHERE user_id = ${userId} AND amount > 0
    `;
    const expensesResult = await sql`
     SELECt COALESCE(sum(amount), 0) AS expenses FROM transaction WHERE user_id = ${userId} AND amount < 0
   `;

   res.status(201).json({
    balance: balancedResult[0].balance,
    income: incomeResult[0].income,
    expenses: expensesResult[0].expenses
   })
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
})

//unknown routes
app.all("*", (req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.status = 404;
  next(err);
})

const PORT = process.env.PORT || 5001;

connectDBInit().then(() => {
  app.listen(PORT, () => {
    console.log(`server is running on port http://localhost:${PORT}`);
  })
});
