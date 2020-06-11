import {
  In,
  getRepository,
  TransactionRepository,
  getCustomRepository,
} from 'typeorm';
import csvParser from 'csv-parse';
import fs from 'fs';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface TransactionCSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    // TODO
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getRepository(Transaction);
    const contactsReadStream = fs.createReadStream(filePath);

    const parsers = csvParser({
      from_line: 2, // ignora header
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: TransactionCSV[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index); // O segundo filtro retira as duplicatas

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createTransactions = transactionsRepository.create(
      transactions.map(transactions => ({
        title: transactions.title,
        type: transactions.type,
        value: transactions.value,
        category: finalCategories.find(
          category => category.title === transactions.category,
        ),
      })),
    );

    await transactionsRepository.save(createTransactions);

    await fs.promises.unlink(filePath);

    return createTransactions;
  }
}

export default ImportTransactionsService;
