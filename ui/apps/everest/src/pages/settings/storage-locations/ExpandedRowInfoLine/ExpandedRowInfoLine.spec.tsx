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

import { render, screen } from '@testing-library/react';
import { ExpandedRowInfoLine } from './ExpandedRowInfoLine';

describe('ExpandedRowInfoLine', () => {
  it('should show nothing if no value is passed', () => {
    render(<ExpandedRowInfoLine label="My Label" />);
    expect(screen.queryByText('My Label')).not.toBeInTheDocument();
  });

  it('should show nothing if empty string is passed', () => {
    render(<ExpandedRowInfoLine label="My Label" value="" />);
    expect(screen.queryByText('My Label')).not.toBeInTheDocument();
  });

  it('should show nothing if undefined is passed', () => {
    render(<ExpandedRowInfoLine label="My Label" value={undefined} />);
    expect(screen.queryByText('My Label')).not.toBeInTheDocument();
  });

  it('should show correctly if 0 is passed', () => {
    render(<ExpandedRowInfoLine label="My Label" value={0} />);
    expect(screen.queryByText('My Label')).toBeInTheDocument();
    expect(screen.queryByText('0')).toBeInTheDocument();
  });

  it('should show correctly', () => {
    render(<ExpandedRowInfoLine label="My Label" value="Value 1" />);
    expect(screen.queryByText('My Label')).toBeInTheDocument();
    expect(screen.queryByText('Value 1')).toBeInTheDocument();
  });
});
