// src/_helpers/db.ts
import config from '../../config.json';
import { Sequelize } from 'sequelize';
import userModel = require('../users/user.model');

export interface Database {
    User: any;
}

export const db: Database = {} as Database;

export async function initialize(): Promise<void> {
    const { host, port, user, password, database } = config.database;

    // Create database if it doesn't exist
    const tempSequelize = new Sequelize('', user, password, {
        host,
        port,
        dialect: 'mysql',
        logging: false
    });

    await tempSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await tempSequelize.close();

    // Connect to the actual database
    const sequelize = new Sequelize(database, user, password, {
        host,
        port,
        dialect: 'mysql',
        logging: false
    });

    db.User = userModel.default(sequelize);

    await sequelize.sync({ alter: true });

    console.log('✅ Database initialized and models synced');
}