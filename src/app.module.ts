import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigType } from '@nestjs/config';
import mailConfig from './config/mail.config';
import redisConfig from './config/redis.config';
import authConfig from './config/auth.config';
import appConfig from './config/app.config';
import graphqlConfig from './config/graphql.config';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { SecurityModule } from './security/security.module';
import { CommonModule } from './common/modules/common.module';
import { CoreModule } from './core/core.module';
import elasticSearchConfig from './config/elastic-search.config';
import firebaseConfig from './config/firebase.config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UserDataLoader } from './common/modules/dataloader/user.dataloader';
import { LocationDataLoader } from './common/modules/dataloader/location.dataloader';
import { AttachmentDataLoader } from './common/modules/dataloader/attachment.dataloader';
import { CategoryDataLoader } from './common/modules/dataloader/category.dataloader';
import { DonationDataLoader } from './common/modules/dataloader/donation.dataloader';
import { PresenceDataLoader } from './common/modules/dataloader/presence.dataloader';
import { DonationReservableDataLoader } from './common/modules/dataloader/donation-reservable.dataloader';
import { MessageDataLoader } from './common/modules/dataloader/message.dataloader';
import { IDataLoaders } from './common/modules/dataloader/dataloader.interface';
import dbConfig from './config/db.config';
import { HttpExceptionFilter } from './common/filter/httpException.filter';
import { APP_FILTER } from '@nestjs/core';
import { ErrorsModule } from './common/errors/errors.module';
import { DatabaseExceptionFilter } from './common/filter/db.filer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the configuration available globally
      validationSchema: null, // You can define a Joi schema here for validation if needed
      expandVariables: true,
      load: [
        mailConfig,
        redisConfig,
        authConfig,
        appConfig,
        elasticSearchConfig,
        dbConfig,
        graphqlConfig,
        firebaseConfig,
      ],
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [CommonModule],
      useFactory: (
        graphqlConfiguration: ConfigType<typeof graphqlConfig>,
        userDataLoader: UserDataLoader,
        locationDataLoader: LocationDataLoader,
        attachmentDataLoader: AttachmentDataLoader,
        categoryDataLoader: CategoryDataLoader,
        donationDataLoader: DonationDataLoader,
        presenceDataLoader: PresenceDataLoader,
        donationReservableDataLoader: DonationReservableDataLoader,
        messageDataLoader: MessageDataLoader,
      ) => ({
        ...graphqlConfiguration,
        // Override context to inject DataLoaders per request

        context: ({ req, res }: { req: any; res: any }) => {
          const loaders: IDataLoaders = {
            userLoader: userDataLoader.createLoader(),
            locationLoader: locationDataLoader.createLoader(),
            attachmentLoader: attachmentDataLoader.createLoader(),
            categoryLoader: categoryDataLoader.createLoader(),
            donationLoader: donationDataLoader.createLoader(req?.user?.id),
            presenceLoader: presenceDataLoader.createLoader(),
            donationReservableLoader: req?.user?.id
              ? donationReservableDataLoader.createLoader(req.user.id)
              : undefined,
            messageLoader: messageDataLoader.createLoader(),
          };
          return { req, res, loaders };
        },
      }),
      inject: [
        graphqlConfig.KEY,
        UserDataLoader,
        LocationDataLoader,
        AttachmentDataLoader,
        CategoryDataLoader,
        DonationDataLoader,
        PresenceDataLoader,
        DonationReservableDataLoader,
        MessageDataLoader,
      ],
    }),
    InfrastructureModule,
    MonitoringModule,
    SecurityModule,

    CommonModule,
    CoreModule,
    ErrorsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DatabaseExceptionFilter,
    },
  ],
})
export class AppModule {}
