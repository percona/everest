package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/AlekSi/pointer"
	"github.com/percona/everest/client"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBackupStorage(t *testing.T) {
	th := &testHelper{}
	th.beforeTest(t)
	t.Cleanup(func() {
		th.teardown(t)
	})

	t.Run("s3", func(t *testing.T) {
		backupStorageName := "backup-storage-" + newTestSuffix()
		t.Run("create", func(t *testing.T) {
			payload := client.CreateBackupStorageJSONRequestBody{
				Type:        "s3",
				Name:        backupStorageName,
				Url:         pointer.To("http://custom-url"),
				Description: pointer.To("Dev storage"),
				BucketName:  "percona-test-backup-storage",
				Region:      "us-east-2",
				AccessKey:   "sdfs",
				SecretKey:   "sdfsdfsd",
			}

			resp, err := th.everestClient.CreateBackupStorageWithResponse(t.Context(), th.testNs, payload)
			require.NoError(t, err)
			require.Equal(t, http.StatusCreated, resp.StatusCode())

			var created client.BackupStorage
			require.NoError(t, json.Unmarshal(resp.Body, &created))

			assert.Equal(t, payload.Name, created.Name)
			assert.Equal(t, string(payload.Type), string(created.Type))
			assert.Equal(t, pointer.Get(payload.Url), pointer.Get(created.Url))
			assert.Equal(t, pointer.Get(payload.Description), pointer.Get(created.Description))
			assert.Equal(t, payload.BucketName, created.BucketName)
			assert.Equal(t, payload.Region, created.Region)
		})

		t.Run("update", func(t *testing.T) {
			payload := client.UpdateBackupStorageJSONRequestBody{
				Description: pointer.To("Updated storage"),
			}

			resp, err := th.everestClient.UpdateBackupStorageWithResponse(t.Context(), th.testNs, backupStorageName, payload)
			require.NoError(t, err)
			require.Equal(t, http.StatusOK, resp.StatusCode())

			updated := resp.JSON200
			assert.NotNil(t, updated)
			assert.Equal(t, pointer.Get(payload.Description), pointer.Get(updated.Description))
		})
		t.Run("list", func(t *testing.T) {
			resp, err := th.everestClient.ListBackupStoragesWithResponse(t.Context(), th.testNs)
			require.NoError(t, err)
			require.Equal(t, http.StatusOK, resp.StatusCode())

			list := resp.JSON200
			assert.NotNil(t, list)

			assert.Len(t, *list, 1)
		})
		t.Run("delete", func(t *testing.T) {
			resp, err := th.everestClient.DeleteBackupStorageWithResponse(t.Context(), th.testNs, backupStorageName)
			require.NoError(t, err)
			require.Equal(t, http.StatusNoContent, resp.StatusCode())

			bs, err := th.everestClient.GetBackupStorageWithResponse(t.Context(), th.testNs, backupStorageName)
			require.NoError(t, err)
			require.Equal(t, http.StatusNotFound, bs.StatusCode())
		})
	})

	t.Run("creation failures", func(t *testing.T) {
		testCases := []struct {
			payload   []byte
			errorText string
		}{
			{
				payload:   []byte(`{}`),
				errorText: "property \"name\" is missing",
			},
			{
				payload: []byte(`{
				"type": "s3", 
				"name": "backup-storage", 
				"bucketName": "percona-test-backup-storage", 
				"region": "us-east-2", 
				"accessKey": "ssdssd"}`),
				errorText: "property \"secretKey\" is missing",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.errorText, func(t *testing.T) {
				payload := bytes.NewBuffer(tc.payload)

				resp, err := th.everestClient.CreateBackupStorageWithBody(context.Background(), th.testNs, "application/json", payload)
				require.NoError(t, err)
				require.Equal(t, http.StatusBadRequest, resp.StatusCode)

				body, err := io.ReadAll(resp.Body)
				require.NoError(t, err)
				defer resp.Body.Close()

				var parsed *client.Error
				require.NoError(t, json.Unmarshal(body, &parsed))
				require.Contains(t, *parsed.Message, tc.errorText)
			})
		}
	})
}
