#!/bin/bash

# Configuration
DOCKERHUB_USERNAME=${DOCKERHUB_USERNAME:-"zakigoumri"}
DOCKER_IMAGE="${DOCKERHUB_USERNAME}/gapzero"
PROD_COMPOSE="compose.prod.yml"

echo "--- Deploying latest $DOCKER_IMAGE ---"

# 1. Pull latest image
echo "Pulling latest image..."
docker pull $DOCKER_IMAGE:latest

# 2. Detect which container is currently being served by Traefik
if docker ps --format '{{.Names}}' | grep -q 'app_blue'; then
    OLD='app_blue'
    NEW='app_green'
else
    OLD='app_green'
    NEW='app_blue'
fi

echo "Current active container: $OLD. Deploying to $NEW..."

# 3. Ensure infrastructure is running (network, db, redis, traefik)
echo "Ensuring infrastructure services are up..."
docker compose -f $PROD_COMPOSE up -d db redis traefik loki grafana dbgate

# Wait for DB to be ready (optional but recommended)
echo "Waiting for database to be ready..."
MAX_DB_RETRIES=30
DB_WAIT_SECONDS=2
DB_STATUS=""
for i in $(seq 1 $MAX_DB_RETRIES); do
    DB_CONTAINER_ID=$(docker compose -f $PROD_COMPOSE ps -q db)
    DB_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$DB_CONTAINER_ID" 2>/dev/null || echo "")
    if [ "$DB_STATUS" == "healthy" ]; then
        echo "Database is healthy."
        break
    fi
    echo "Database status: ${DB_STATUS:-unknown}... Waiting ($i/$MAX_DB_RETRIES)"
    sleep $DB_WAIT_SECONDS
done

# 5. Start the new container
echo "Starting $NEW..."
docker compose -f $PROD_COMPOSE up -d $NEW

# 6. Wait for the new container to pass its health check
echo "Waiting for $NEW to become healthy..."
MAX_RETRIES=20
WAIT_SECONDS=5
STATUS="starting"

# Resolve the actual container id created by compose and inspect its health
CONTAINER_ID=$(docker compose -f $PROD_COMPOSE ps -q $NEW)
for i in $(seq 1 $MAX_RETRIES); do
    # Refresh container id if not yet available
    if [ -z "$CONTAINER_ID" ]; then
        CONTAINER_ID=$(docker compose -f $PROD_COMPOSE ps -q $NEW)
    fi
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_ID" 2>/dev/null || echo "")
    if [ "$STATUS" == "healthy" ]; then
        echo "$NEW is healthy! Traffic will now start shifting."
        break
    fi
    echo "Status: ${STATUS:-unknown}... Waiting ($i/$MAX_RETRIES)"
    sleep $WAIT_SECONDS
done

# 7. If health check passed, stop the old container. Otherwise, rollback.
if [ "$STATUS" == "healthy" ]; then
    echo "Success! Stopping old container $OLD..."
    docker compose -f $PROD_COMPOSE stop $OLD
    echo "Deployment complete! Running on $NEW."
else
    echo "ERROR: Health check failed for $NEW! Rolling back..."
    docker compose -f $PROD_COMPOSE stop $NEW
    exit 1
fi
