package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"strings"

	"github.com/AlekSi/pointer"
	"github.com/smarty/gunit"

	"github.com/percona/everest/client"
)

func newTestSuffix() string {
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}

func (s *backupStorageTestSuite) TestBasicAPIOperations() {
	backupStorageName := "backup-storage-" + newTestSuffix()
	s.Run("create backup storage success", func(f *gunit.Fixture) {
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

		resp, err := s.everestClient.CreateBackupStorage(context.Background(), s.testNs, payload)
		f.Assert(err == nil)
		f.Assert(resp != nil)
		f.Assert(resp.StatusCode == http.StatusCreated)

		body, err := io.ReadAll(resp.Body)
		f.Assert(err == nil)
		f.Assert(body != nil)

		var created client.BackupStorage
		f.Assert(json.Unmarshal(body, &created) == nil)

		f.AssertEqual(payload.Name, created.Name)
		f.AssertEqual(string(payload.Type), string(created.Type))
		f.AssertEqual(pointer.Get(payload.Url), pointer.Get(created.Url))
		f.AssertEqual(pointer.Get(payload.Description), pointer.Get(created.Description))
		f.AssertEqual(payload.BucketName, created.BucketName)
		f.AssertEqual(payload.Region, created.Region)
	})

	s.Run("update backup storage success", func(f *gunit.Fixture) {
		payload := client.UpdateBackupStorageJSONRequestBody{
			Description: pointer.To("Updated storage"),
		}

		resp, err := s.everestClient.UpdateBackupStorage(context.Background(), s.testNs, backupStorageName, payload)
		f.AssertEqual(err, nil)
		f.AssertEqual(resp.StatusCode, http.StatusOK)

		body, err := io.ReadAll(resp.Body)
		f.AssertEqual(err, nil)
		defer resp.Body.Close()

		var parsed *client.BackupStorage
		f.AssertEqual(json.Unmarshal(body, &parsed), nil)

		f.AssertEqual(pointer.Get(payload.Description), pointer.Get(parsed.Description))
	})

	s.Run("list backup storage success", func(f *gunit.Fixture) {
		resp, err := s.everestClient.ListBackupStorages(context.Background(), s.testNs)
		f.Assert(err == nil)
		f.Assert(resp.StatusCode == http.StatusOK)

		body, err := io.ReadAll(resp.Body)
		f.Assert(err == nil)
		defer resp.Body.Close()

		var parsed *client.BackupStoragesList
		f.Assert(json.Unmarshal(body, &parsed) == nil)

		f.Assert(len(*parsed) == 1)
	})

	s.Run("delete backup storage success", func(f *gunit.Fixture) {
		resp, err := s.everestClient.DeleteBackupStorage(context.Background(), s.testNs, backupStorageName)
		f.Assert(err == nil)
		f.Assert(resp.StatusCode == http.StatusNoContent)

		resp, err = s.everestClient.GetBackupStorage(context.Background(), s.testNs, backupStorageName)
		f.Assert(err == nil)
		f.Assert(resp.StatusCode == http.StatusNotFound)
	})
}

func (s *backupStorageTestSuite) TestCreateFailures() {
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
		s.Run(tc.errorText, func(f *gunit.Fixture) {
			payload := bytes.NewBuffer(tc.payload)

			resp, err := s.everestClient.CreateBackupStorageWithBody(context.Background(), s.testNs, "application/json", payload)
			f.Assert(err == nil)
			f.Assert(resp.StatusCode == http.StatusBadRequest)

			body, err := io.ReadAll(resp.Body)
			f.Assert(err == nil)
			defer resp.Body.Close()

			var parsed *client.Error
			f.Assert(json.Unmarshal(body, &parsed) == nil)
			f.Assert(strings.Contains(*parsed.Message, tc.errorText))
		})
	}
}
