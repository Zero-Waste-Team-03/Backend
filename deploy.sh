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
docker compose -f $PROD_COMPOSE up -d db redis traefik

# Wait for DB to be ready (optional but recommended)
echo "Waiting for database to be ready..."
sleep 5

# 4. Start the new container
echo "Starting $NEW..."
docker compose -f $PROD_COMPOSE up -d $NEW

# 6. Wait for the new container to pass its health check
echo "Waiting for $NEW to become healthy..."
MAX_RETRIES=20
WAIT_SECONDS=5
STATUS="starting"

for i in $(seq 1 $MAX_RETRIES); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' $NEW 2>/dev/null)
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
