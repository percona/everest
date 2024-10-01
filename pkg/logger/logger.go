// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package logger provides functionality related to logging.
package logger

import (
	"fmt"
	"time"

	"github.com/spf13/cobra"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/percona/everest/cmd/config"
)

// MustInitLogger initializes logger and panics in case of an error. // FIXME Test this.
func MustInitLogger(json bool) *zap.Logger {
	var loggerCfg zap.Config
	if config.Debug {
		loggerCfg = zap.NewDevelopmentConfig()
		loggerCfg.DisableCaller = true
	} else {
		loggerCfg = zap.NewProductionConfig()
		loggerCfg.EncoderConfig = zap.NewProductionEncoderConfig()
		loggerCfg.EncoderConfig.TimeKey = "T"
		loggerCfg.EncoderConfig.EncodeTime = zapcore.TimeEncoder(func(t time.Time, enc zapcore.PrimitiveArrayEncoder) {
			enc.AppendString(t.UTC().Format("2006-01-02T15:04:05Z0700"))
		})
	}
	loggerCfg.Encoding = "console"
	if json {
		loggerCfg.Encoding = "json"
	}
	loggerCfg.DisableStacktrace = true

	logger, err := loggerCfg.Build()
	if err != nil {
		panic(fmt.Sprintf("Cannot initialize logger: %s", err))
	}

	return logger
}

// MustInitVerboseLogger initializes a verbose logger and panics in case of an error.
func MustInitVerboseLogger(json bool) *zap.Logger {
	lCfg := zap.NewDevelopmentConfig()
	if json {
		lCfg.Encoding = "json"
	}

	l, err := lCfg.Build()
	if err != nil {
		panic(fmt.Sprintf("Cannot initialize logger: %s", err))
	}

	return l
}

// InitLoggerInRootCmd inits the provided logger instance based on command's flags.
// This is meant to be run by the root command in PersistentPreRun step.
func InitLoggerInRootCmd(cmd *cobra.Command, l *zap.SugaredLogger) {
	verbose, err := cmd.Flags().GetBool("verbose")
	if err != nil {
		l.Warn(`Could not parse "verbose" flag`)
	}

	json, err := cmd.Flags().GetBool("json")
	if err != nil {
		l.Warn(`Could not parse "json" flag`)
	}

	if verbose {
		*l = *MustInitVerboseLogger(json).Sugar()
	} else if json {
		*l = *MustInitLogger(true).Sugar()
	}
}
