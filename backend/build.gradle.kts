plugins {
  id("org.springframework.boot") version "3.4.5"
  id("io.spring.dependency-management") version "1.1.7"
  kotlin("jvm") version "2.0.21"
  kotlin("plugin.spring") version "2.0.21"
  kotlin("plugin.jpa") version "2.0.21"
  id("org.jlleitschuh.gradle.ktlint") version "12.2.0"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"

java {
  toolchain {
    languageVersion = JavaLanguageVersion.of(17) // Kotlin 2.0.21 호환성
  }
}

repositories {
  mavenCentral()
}

dependencies {
  // Spring Boot
  implementation("org.springframework.boot:spring-boot-starter-web")
  implementation("org.springframework.boot:spring-boot-starter-data-jpa")
  implementation("org.springframework.boot:spring-boot-starter-validation")
  implementation("org.springframework.boot:spring-boot-starter-security")

  // Kotlin
  implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
  implementation("org.jetbrains.kotlin:kotlin-reflect")

  // Database
  runtimeOnly("com.mysql:mysql-connector-j")

  // JWT
  implementation("io.jsonwebtoken:jjwt-api:0.12.6")
  runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
  runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

  // Swagger / OpenAPI
  implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.8")

  // DevTools
  developmentOnly("org.springframework.boot:spring-boot-devtools")

  // Test
  testImplementation("org.springframework.boot:spring-boot-starter-test")
  testImplementation("org.springframework.security:spring-security-test")
  testImplementation("com.ninja-squad:springmockk:4.0.2") // MockK for Spring
  testRuntimeOnly("com.h2database:h2")
}

tasks.withType<Test> {
  useJUnitPlatform()
}

kotlin {
  compilerOptions {
    freeCompilerArgs = listOf("-Xjsr305=strict")
    jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17 // Kotlin 2.0.21은 JVM 17까지만 지원
  }
}

ktlint {
  android = false
  outputColorName = "RED"
  filter {
    exclude { it.file.path.contains("generated/") }
  }
}
