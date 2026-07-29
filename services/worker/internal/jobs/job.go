package jobs

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Job واجهة موحّدة لكل مهمة خلفية دورية.
type Job interface {
	Name() string
	Run(ctx context.Context, db *pgxpool.Pool) error
}

// RunAll ينفّذ كل المهام بالتسلسل ويسجّل أي فشل دون إيقاف بقية المهام.
func RunAll(ctx context.Context, db *pgxpool.Pool, jobs []Job) {
	for _, j := range jobs {
		if err := j.Run(ctx, db); err != nil {
			log.Printf("[worker] فشلت المهمة %q: %v", j.Name(), err)
			continue
		}
		log.Printf("[worker] اكتملت المهمة %q", j.Name())
	}
}
