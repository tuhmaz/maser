package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/alemedu/worker/internal/config"
	"github.com/alemedu/worker/internal/jobs"
)

func main() {
	cfg := config.Load()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("فشل الاتصال بقاعدة البيانات: %v", err)
	}
	defer db.Close()

	registeredJobs := []jobs.Job{
		jobs.ExpireAbandonedAttempts{},
		jobs.GenerateDailyPlans{},
	}

	log.Printf("Alemedu Worker يعمل (كل %s) في بيئة %s", cfg.JobInterval, cfg.AppEnv)

	ticker := time.NewTicker(cfg.JobInterval)
	defer ticker.Stop()

	jobs.RunAll(ctx, db, registeredJobs) // تشغيل فوري عند الإقلاع

	for {
		select {
		case <-ctx.Done():
			log.Println("Alemedu Worker: إيقاف نظيف")
			return
		case <-ticker.C:
			jobs.RunAll(ctx, db, registeredJobs)
		}
	}
}
