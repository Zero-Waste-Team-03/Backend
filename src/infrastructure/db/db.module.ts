import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import dbConfig from 'src/config/db.config';

/**
 * @description This module is responsible for database connection and ORM setup if an orm is used.
 * It can provide database services to other modules in the application.
 *
 * @module DbModule in here you should import and configure your database connection and ORM (e.g., TypeORM, Sequelize).
 *  * You can also define and export database-related services or repositories that can be injected into other modules.
 *  than export the database connection and any related services to be used in other modules.
 *  * @example
 *  import { TypeOrmModule } from '@nestjs/typeorm';
 *  @Module({
 *  imports: [
 *  TypeOrmModule.forRoot({
 *  type: 'postgres',
 *    host: 'localhost',
 *    port: 5432,
 *    username: 'test',
 *    password: 'test',
 *    database: 'test',
 *    entities: [],
 *    synchronize: true,
 *    }),
 *    ],
 *    exports: [TypeOrmModule],
 *    })
 *    export class DbModule {}
 * */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigType<typeof dbConfig>) => config,
      inject: [dbConfig.KEY],
    }),
  ],
  exports: [TypeOrmModule],
})
export class DbModule {}
