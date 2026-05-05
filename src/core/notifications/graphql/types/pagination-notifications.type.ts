import { ObjectType } from "@nestjs/graphql";
import { Paginated } from "src/common/graphql/types/pagination.type";
import { NotificationTypeGraphQL } from "./notification.type";

@ObjectType("PaginatedNotifications")
export class PaginatedNotifications extends Paginated(NotificationTypeGraphQL){}
