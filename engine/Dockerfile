# Spring Boot engine. Multi-arch base images: builds on the ARM (Ampere) Oracle server as well as x86.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package && cp target/*.jar /src/app.jar

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 astro
WORKDIR /app
COPY --from=build /src/app.jar app.jar
USER astro
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
