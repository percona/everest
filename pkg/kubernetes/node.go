package kubernetes

import (
	"context"
	"errors"

	corev1 "k8s.io/api/core/v1"
)

// GetWorkerNodes returns list of cluster workers nodes.
func (k *Kubernetes) GetWorkerNodes(ctx context.Context) ([]corev1.Node, error) {
	nodes, err := k.client.GetNodes(ctx)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not get nodes of Kubernetes cluster"))
	}
	forbidenTaints := map[string]corev1.TaintEffect{
		"node.cloudprovider.kubernetes.io/uninitialized": corev1.TaintEffectNoSchedule,
		"node.kubernetes.io/unschedulable":               corev1.TaintEffectNoSchedule,
		"node-role.kubernetes.io/master":                 corev1.TaintEffectNoSchedule,
	}
	workers := make([]corev1.Node, 0, len(nodes.Items))
	for _, node := range nodes.Items {
		if len(node.Spec.Taints) == 0 {
			workers = append(workers, node)
			continue
		}
		for _, taint := range node.Spec.Taints {
			effect, keyFound := forbidenTaints[taint.Key]
			if !keyFound || effect != taint.Effect {
				workers = append(workers, node)
			}
		}
	}
	return workers, nil
}

// IsNodeInCondition returns true if node's condition given as an argument has
// status "True". Otherwise it returns false.
func IsNodeInCondition(node corev1.Node, conditionType corev1.NodeConditionType) bool {
	for _, condition := range node.Status.Conditions {
		if condition.Status == corev1.ConditionTrue && condition.Type == conditionType {
			return true
		}
	}
	return false
}
