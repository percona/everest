package helm

const (
	// FlagChartDir is a CLI flag for specifying the chart directory.
	FlagChartDir = "chart-dir"
	// FlagRepository is a CLI flag for specifying the Helm repository.
	FlagRepository = "helm.repository"
	// FlagHelmSet is a CLI flag for setting Helm values.
	FlagHelmSet = "helm.set"
	// FlagHelmValues is a CLI flag for specifying Helm values files.
	FlagHelmValues = "helm.values"
	// FlagHelmReuseValues is a CLI flag for reusing Helm values.
	FlagHelmReuseValues = "helm.reuse-values"
	// FlagHelmResetValues is a CLI flag for resetting Helm values.
	FlagHelmResetValues = "helm.reset-values"
	// FlagHelmResetThenReuseValues is a CLI flag for resetting then reusing Helm values.
	FlagHelmResetThenReuseValues = "helm.reset-then-reuse-values"
)
