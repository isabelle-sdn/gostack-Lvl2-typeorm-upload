import { EntityRepository, Repository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    // TODO

    const findIncome = await getRepository(Transaction)
      .createQueryBuilder('transactions')
      .select('SUM(transactions.value)', 'totalIncome')
      .where('transactions.type = :type', { type: 'income' })
      .getRawMany();

    const findOutcome = await getRepository(Transaction)
      .createQueryBuilder('transactions')
      .select('SUM(transactions.value)', 'totalOutcome')
      .where('transactions.type = :type', { type: 'outcome' })
      .getRawMany();

    const income = Math.round(findIncome[0].totalIncome);
    const outcome = Math.round(findOutcome[0].totalOutcome);

    const total = income - outcome;

    return {
      income,
      outcome,
      total,
    };
  }
}

export default TransactionsRepository;
