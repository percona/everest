package integration_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/AlekSi/pointer"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"oras.land/oras-go/pkg/context"

	"github.com/percona/everest/client"
)

var _ = Describe("Backup Storages", func() {
	Context("of type s3", func() {
		createdBackupStorageName := ""
		It("can be created", func() {
			payload := client.CreateBackupStorageJSONRequestBody{
				Type:        "s3",
				Name:        "backup-storage-" + newTestSuffix(),
				Url:         pointer.To("http://custom-url"),
				Description: pointer.To("Dev storage"),
				BucketName:  "percona-test-backup-storage",
				Region:      "us-east-2",
				AccessKey:   "sdfs",
				SecretKey:   "sdfsdfsd",
			}

			resp, err := everestClient.CreateBackupStorage(context.Background(), testNs, payload)
			Expect(err).NotTo(HaveOccurred())
			Expect(resp.StatusCode).To(Equal(http.StatusCreated))

			body, err := io.ReadAll(resp.Body)
			Expect(err).NotTo(HaveOccurred())
			defer resp.Body.Close()

			var parsed *client.BackupStorage
			Expect(json.Unmarshal(body, &parsed)).To(Succeed())

			Expect(parsed.Name).To(Equal(payload.Name))
			Expect(string(parsed.Type)).To(Equal(string(payload.Type)))
			Expect(*parsed.Url).To(Equal(*payload.Url))
			Expect(parsed.BucketName).To(Equal(payload.BucketName))
			Expect(parsed.Region).To(Equal(payload.Region))

			createdBackupStorageName = parsed.Name
		})
		It("can be updated", func() {
			payload := client.UpdateBackupStorageJSONRequestBody{
				Description: pointer.To("Updated storage"),
			}

			resp, err := everestClient.UpdateBackupStorage(context.Background(), testNs, createdBackupStorageName, payload)
			Expect(err).NotTo(HaveOccurred())
			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			body, err := io.ReadAll(resp.Body)
			Expect(err).NotTo(HaveOccurred())
			defer resp.Body.Close()

			var parsed *client.BackupStorage
			Expect(json.Unmarshal(body, &parsed)).To(Succeed())

			Expect(parsed.Description).To(Equal(payload.Description))
		})
		It("can be listed", func() {
			resp, err := everestClient.ListBackupStorages(context.Background(), testNs)
			Expect(err).NotTo(HaveOccurred())
			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			body, err := io.ReadAll(resp.Body)
			Expect(err).NotTo(HaveOccurred())
			defer resp.Body.Close()

			var parsed *client.BackupStoragesList
			Expect(json.Unmarshal(body, &parsed)).To(Succeed())

			Expect(len(*parsed)).To(Equal(1))
		})
		It("can be deleted", func() {
			resp, err := everestClient.DeleteBackupStorage(context.Background(), testNs, createdBackupStorageName)
			Expect(err).NotTo(HaveOccurred())
			Expect(resp.StatusCode).To(Equal(http.StatusNoContent))

			resp, err = everestClient.GetBackupStorage(context.Background(), testNs, createdBackupStorageName)
			Expect(err).NotTo(HaveOccurred())
			Expect(resp.StatusCode).To(Equal(http.StatusNotFound))
		})
	})
	Describe("creation", func() {
		When("property 'name' is missing", func() {
			It("should fail", func() {
				payload := bytes.NewBufferString(`{}`)

				resp, err := everestClient.CreateBackupStorageWithBody(context.Background(), testNs, "application/json", payload)
				Expect(err).NotTo(HaveOccurred())
				Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

				body, err := io.ReadAll(resp.Body)
				Expect(err).NotTo(HaveOccurred())
				defer resp.Body.Close()

				var parsed *client.Error
				Expect(json.Unmarshal(body, &parsed)).To(Succeed())
				Expect(*parsed.Message).To(ContainSubstring("property \"name\" is missing"))
			})
		})
		When("property 'secretKey' is missing", func() {
			It("should fail", func() {
				payload := bytes.NewBufferString(`{
					"type": "s3",
					"name": "backup-storage",
					"bucketName": "percona-test-backup-storage",
					"region": "us-east-2",
					"accessKey": "ssdssd"
				}`)

				resp, err := everestClient.CreateBackupStorageWithBody(context.Background(), testNs, "application/json", payload)

				Expect(err).NotTo(HaveOccurred())
				Expect(resp.StatusCode).To(Equal(http.StatusBadRequest))

				body, err := io.ReadAll(resp.Body)
				Expect(err).NotTo(HaveOccurred())
				defer resp.Body.Close()

				var parsed *client.Error
				Expect(json.Unmarshal(body, &parsed)).To(Succeed())
				Expect(*parsed.Message).To(ContainSubstring("property \"secretKey\" is missing"))
			})
		})
	})
})
