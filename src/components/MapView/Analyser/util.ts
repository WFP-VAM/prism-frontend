import { URLParams } from './AnalyserReducer';

export interface propsFromURL {
  fromURL?: boolean;
  params: URLParams;
}

/**
 * Read parameter from an URL.
 *
 * @param path Browser URL.
 * @param URLParamList List o paramater to be read.
 * @returns Object with all valid URL parameters.
 */
export const extractPropsFromURL = (
  path: string,
  URLParamList: string[],
): propsFromURL => {
  const params: URLSearchParams = new URLSearchParams(path);
  const fromShare: boolean = params.get('share') === 'true';
  const paserdURLParams: URLParams = {};

  // Parse URL only if detected as shared URL.
  if (fromShare) {
    URLParamList.forEach((key: string) => {
      if (params.get(key)) {
        // eslint-disable-next-line fp/no-mutation
        paserdURLParams[key as keyof URLParams] = params.get(key) as string;
      }
    });
  }

  return { fromURL: fromShare, params: paserdURLParams };
};

/**
 * Remove form params from the URL.
 *
 * @param path Browser URL;
 * @param URLParamList List of parameter to be filtered from the URL.
 * @returns New URL;
 */
export const removePropsFromURL = (
  path: string,
  URLParamList: string[],
): string => {
  const params: URLSearchParams = new URLSearchParams(path);
  const keys: IterableIterator<string> = params.keys();
  const urlParams: string[] = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const key of keys) {
    if (!URLParamList.includes(key) && key !== 'share') {
      // eslint-disable-next-line fp/no-mutating-methods
      urlParams.push(`${key}=${params.get(key)}`);
    }
  }

  return urlParams.join('&');
};
