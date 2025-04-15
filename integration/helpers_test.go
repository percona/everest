package integration_test

import (
	"fmt"
	"math/rand"
	"time"

	namegen "github.com/goombaio/namegenerator"
)

func newTestPrefix() string {
	return namegen.NewNameGenerator(time.Now().UnixNano()).Generate()
}

func newTestSuffix() string {
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}
