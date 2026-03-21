import dbConfig from '../../config/db.config';
import { DataSource, DataSourceOptions } from 'typeorm';

export default new DataSource(dbConfig() as DataSourceOptions);
