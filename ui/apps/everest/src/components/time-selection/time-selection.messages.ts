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
export const Messages = {
  onMinute: 'on minute',
  minutes: 'minutes',
  on: 'on',
  onDay: 'on day',
  at: 'at',
  am: 'AM',
  pm: 'PM',
  notAvailable:
    'Some time slots are not available due to operator limitations.',
  help: 'Help',
  infoText: (value: string) =>
    `Everest will create a backup of your database every ${value}`,
  getTimeText: {
    hours: 'hour, starting at minute',
    days: 'day, at',
    weeks: 'week on',
    months: 'month, on day',
  },
};
