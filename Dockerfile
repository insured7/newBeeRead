# Etapa 1: Construcción (Usamos Maven y Java 21)
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
# Copiamos el archivo de dependencias y el código fuente
COPY pom.xml .
COPY src ./src
# Compilamos el proyecto saltando los tests para que sea más rápido
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución (Solo necesitamos el entorno de ejecución de Java 21)
FROM eclipse-temurin:21-jre
WORKDIR /app
# Copiamos el archivo .jar generado en la etapa anterior
COPY --from=build /app/target/*.jar app.jar

# Exponemos el puerto 8080
EXPOSE 8080

# Comando para ejecutar la aplicación
ENTRYPOINT ["java", "-jar", "app.jar"]
