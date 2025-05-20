import ComponentAge from '../component-age';
import { ComponentAgeProps } from '../component-age/component-age';

const DiagramComponentAge = ({
  restarts,
  ...componentAgeProps
}: {
  restarts: number;
} & ComponentAgeProps) => (
  <ComponentAge
    {...componentAgeProps}
    render={(formattedDate) =>
      `${formattedDate ? formattedDate + ' | ' : ''}${restarts} restarts`
    }
  />
);

export default DiagramComponentAge;
