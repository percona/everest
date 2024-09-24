package kubernetes

import (
	"context"

	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/percona/everest/pkg/common"
)

// UpdateEverestSettings accepts the full list of Everest settings and updates the settings.
func (k *Kubernetes) UpdateEverestSettings(ctx context.Context, settings common.EverestSettings) error {
	configMapData, err := settings.ToMap()
	if err != nil {
		return err
	}

	_, getErr := k.client.GetConfigMap(ctx, common.SystemNamespace, common.EverestSettingsConfigMapName)
	if getErr != nil && !errors.IsNotFound(getErr) {
		return getErr
	}

	c := &v1.ConfigMap{
		TypeMeta: metav1.TypeMeta{},
		ObjectMeta: metav1.ObjectMeta{
			Name:      common.EverestSettingsConfigMapName,
			Namespace: common.SystemNamespace,
		},
		Data: configMapData,
	}
	if errors.IsNotFound(getErr) {
		_, err = k.client.CreateConfigMap(ctx, c)
		return err
	}

	_, err = k.client.UpdateConfigMap(ctx, c)
	return err
}

// GetEverestSettings returns Everest settings.
func (k *Kubernetes) GetEverestSettings(ctx context.Context) (common.EverestSettings, error) {
	settings := common.EverestSettings{}
	m, err := k.client.GetConfigMap(ctx, common.SystemNamespace, common.EverestSettingsConfigMapName)
	if err != nil {
		return settings, err
	}
	err = settings.FromMap(m.Data)
	return settings, err
}
