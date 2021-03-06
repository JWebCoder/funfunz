import { IConfig } from '../../generator/configurationTypes'

const config: IConfig = {
  connectors: {
    mainDatabase: {
      type: '@funfunz/sql-data-connector',
      config: {
        client: 'mysql2',
        host: process.env.DB_HOST || '127.0.0.1',
        database: process.env.DB_NAME || 'test_db',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || 'password',
        port: process.env.DB_PORT || '3306'
      },
    }
  }
}
export default config