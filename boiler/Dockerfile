# Этап сборки (Builder)
FROM golang:1.20-alpine AS builder
WORKDIR /app
COPY main.go .
# Отключаем CGO для сборки легковесного бинарника
RUN CGO_ENABLED=0 GOOS=linux go build -o boiler-bot main.go

# Финальный легковесный образ
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/boiler-bot .

# Указываем порт, который слушает приложение внутри контейнера
EXPOSE 1910

# Запускаем бота, обязательно указывая 0.0.0.0, чтобы он принимал внешние подключения
ENTRYPOINT ["./boiler-bot", "-addr", "0.0.0.0:1910"]
