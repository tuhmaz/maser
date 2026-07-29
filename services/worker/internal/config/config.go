package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv       string
	DatabaseURL  string
	JobInterval  time.Duration
}

func Load() *Config {
	_ = godotenv.Load()

	seconds := 60
	if v := os.Getenv("JOB_INTERVAL_SECONDS"); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			seconds = i
		}
	}

	return &Config{
		AppEnv:      getEnv("APP_ENV", "development"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		JobInterval: time.Duration(seconds) * time.Second,
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
