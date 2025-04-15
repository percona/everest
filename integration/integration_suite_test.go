package integration_test

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/percona/everest/client"
)

func TestBooks(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "Integration Suite")
}

var (
	everestAPIUrl string
	everestClient *client.Client
	testNs        string = "everest"
)

func init() {
	if ns, ok := os.LookupEnv("INTEGRATION_TEST_NAMESPACE"); ok {
		testNs = ns
	}

	if url, ok := os.LookupEnv("INTEGRATION_TEST_API_URL"); ok {
		everestAPIUrl = url
	} else {
		panic("INTEGRATION_TEST_API_URL is not set")
	}

	if c, err := newEverestClient(); err != nil {
		panic(err)
	} else {
		everestClient = c
	}
}

func newEverestClient() (*client.Client, error) {
	apiToken, ok := os.LookupEnv("INTEGRATION_TEST_API_TOKEN")
	if !ok {
		return nil, fmt.Errorf("INTEGRATION_TEST_API_TOKEN is not set")
	}

	attachAPITokenReqModifier := func(_ context.Context, req *http.Request) error {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiToken))
		return nil
	}

	everestClient, err := client.NewClient(everestAPIUrl,
		client.WithRequestEditorFn(attachAPITokenReqModifier))
	if err != nil {
		return nil, err
	}
	return everestClient, nil
}
