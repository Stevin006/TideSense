import styledComponents, {
  css as styledCss,
  useTheme as styledUseTheme,
} from 'styled-components/native';
import type { ReactNativeStyledInterface } from 'styled-components/native';

import type { AppTheme } from './theme';

const styled = styledComponents as ReactNativeStyledInterface<AppTheme>;

export const css = styledCss;
export const useTheme = styledUseTheme;

export default styled;

