package integration

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"testing"

	"github.com/smarty/gunit"

	"github.com/percona/everest/client"
)

type backupStorageTestSuite struct {
	*gunit.Fixture

	everestClient *client.Client
	testNs        string
}

const defaultTestNs = "everest"

func (s *backupStorageTestSuite) Setup() {
	s.testNs = defaultTestNs
	if ns, ok := os.LookupEnv("INTEGRATION_TEST_NAMESPACE"); ok {
		s.testNs = ns
	}
	c, err := newEverestClient()
	if err != nil {
		panic(err)
	}
	s.everestClient = c
}

func newEverestClient() (*client.Client, error) {
	apiToken, ok := os.LookupEnv("INTEGRATION_TEST_API_TOKEN")
	if !ok {
		return nil, fmt.Errorf("INTEGRATION_TEST_API_TOKEN is not set")
	}

	url, ok := os.LookupEnv("INTEGRATION_TEST_API_URL")
	if !ok {
		return nil, fmt.Errorf("INTEGRATION_TEST_API_URL is not set")
	}

	attachAPITokenReqModifier := func(_ context.Context, req *http.Request) error {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiToken))
		return nil
	}

	everestClient, err := client.NewClient(url,
		client.WithRequestEditorFn(attachAPITokenReqModifier))
	if err != nil {
		return nil, err
	}
	return everestClient, nil
}

func TestBackupStorage(t *testing.T) {
	gunit.Run(new(backupStorageTestSuite), t)
}
