# ---- build stage: compile the fat jar with Maven ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
# Download dependencies first so they are cached between builds when only source code changes.
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

# ---- runtime stage: small JRE image, non-root user ----
FROM eclipse-temurin:17-jre
WORKDIR /app
# The app user must own /app so H2 can create its ./data directory there.
RUN useradd --system --uid 1001 app && chown app /app
COPY --from=build /build/target/*.jar app.jar
USER app
# Fit comfortably in small containers (e.g. 512 MB free tiers).
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
