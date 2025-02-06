// everest
// Copyright (C) 2025 Percona LLC
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

// Package tui provides UI elements for the CLI.
package tui

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

// Key bindings.
var confirmKeys = confirmKeyMap{
	Confirm: key.NewBinding(
		key.WithKeys("y"),
		key.WithHelp("y", "confirm"),
	),
	Abort: key.NewBinding(
		key.WithKeys("n"),
		key.WithHelp("n", "abort"),
	),
	Quit: quitKeyBinding,
}

type (
	// confirmKeyMap defines a set of keybindings. To work for help it must satisfy
	// key.Map. It could also very easily be a map[string]key.Binding.
	confirmKeyMap struct {
		Confirm key.Binding
		Abort   key.Binding
		Help    key.Binding
		Quit    key.Binding
	}

	// Confirm represents a confirm (y/N) input element.
	Confirm struct {
		keys      confirmKeyMap
		help      help.Model
		textInput textinput.Model
		p         *tea.Program
		confirm   bool // set to true in case user confirms the action
		done      bool // set when user made a choice (doesn't matter if it's y or n)
		interrupt bool // set in case user wants to quit (Esc or Ctrl+c)
	}
)

// ShortHelp returns keybindings to be shown in the mini help view. It's part
// of the key.Map interface.
func (k confirmKeyMap) ShortHelp() []key.Binding {
	return []key.Binding{k.Confirm, k.Abort, k.Quit}
}

// FullHelp returns keybindings for the expanded help view. It's part of the
// key.Map interface.
func (k confirmKeyMap) FullHelp() [][]key.Binding {
	return [][]key.Binding{
		{k.Confirm, k.Abort, k.Quit}, // first column
		{},                           // second column
	}
}

// NewConfirm creates a new confirm input element.
// It asks user the question/message and wait for the confirmation (y/N).
func NewConfirm(ctx context.Context, message string) Confirm {
	ti := textinput.New()
	ti.Prompt = fmt.Sprintf("❓ %s ", message)
	ti.PromptStyle = textStyle
	ti.Placeholder = "(y/N): "
	ti.PlaceholderStyle = helperTextStyle
	ti.Cursor.Style = textStyle
	ti.Cursor.TextStyle = textStyle
	ti.CharLimit = 1
	ti.Focus()

	m := Confirm{
		keys:      confirmKeys,
		help:      newHelpModel(),
		textInput: ti,
	}

	p := tea.NewProgram(m, tea.WithContext(ctx))
	m.p = p
	return m
}

// Run runs the confirm element.
func (m Confirm) Run() (bool, error) {
	model, err := m.p.Run()
	if model.(Confirm).interrupt {
		os.Exit(1)
	}

	return model.(Confirm).confirm, err
}

// Init initializes the text confirm element.
// Implements bubbletea.Model interface.
func (m Confirm) Init() tea.Cmd {
	return textinput.Blink
}

// Update updates the text confirm element.
// Implements bubbletea.Model interface.
func (m Confirm) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	// need to update the text input model first in order to
	// get the correct cursor position and show user's input
	var textInputCmd tea.Cmd
	m.textInput, textInputCmd = m.textInput.Update(msg)

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch {
		case key.Matches(msg, m.keys.Quit):
			m.interrupt = true
			m.textInput.Blur()
			cmd = tea.Quit
		case key.Matches(msg, m.keys.Confirm):
			m.confirm = true
			m.done = true
			m.textInput.Blur()
			cmd = tea.Quit
		case key.Matches(msg, m.keys.Abort):
			m.confirm = false
			m.done = true
			m.textInput.Blur()
			cmd = tea.Quit
		}
	}

	return m, tea.Sequence(textInputCmd, cmd)
}

// View renders the confirm element view.
// Implements bubbletea.Model interface.
func (m Confirm) View() string {
	s := strings.Builder{}
	s.WriteString(fmt.Sprintf("%s\n", m.textInput.View()))

	if !m.done {
		s.WriteString(fmt.Sprintf("\n%s\n", m.help.View(m.keys)))
	}

	return s.String()
}
