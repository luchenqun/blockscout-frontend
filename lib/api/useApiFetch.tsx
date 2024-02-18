import { useQueryClient } from '@tanstack/react-query';
import _omit from 'lodash/omit';
import _pickBy from 'lodash/pickBy';
import React from 'react';

import type { CsrfData } from 'types/client/account';

import config from 'configs/app';
import isBodyAllowed from 'lib/api/isBodyAllowed';
import isNeedProxy from 'lib/api/isNeedProxy';
import { getResourceKey } from 'lib/api/useApiQuery';
import * as cookies from 'lib/cookies';
import type { Params as FetchParams } from 'lib/hooks/useFetch';
import useFetch from 'lib/hooks/useFetch';
import { publicClient } from 'lib/web3/client';

import { abi } from './abi';
import buildUrl from './buildUrl';
import { RESOURCES } from './resources';
import type { ApiResource, ResourceName, ResourcePathParams } from './resources';

export interface Params<R extends ResourceName> {
  pathParams?: ResourcePathParams<R>;
  queryParams?: Record<string, string | Array<string> | number | boolean | undefined>;
  fetchParams?: Pick<FetchParams, 'body' | 'method' | 'signal' | 'headers'>;
}

export default function useApiFetch() {
  const fetch = useFetch();
  const queryClient = useQueryClient();
  const { token: csrfToken } = queryClient.getQueryData<CsrfData>(getResourceKey('csrf')) || {};

  return React.useCallback(<R extends ResourceName, SuccessType = unknown, ErrorType = unknown>(
    resourceName: R,
    { pathParams, queryParams, fetchParams }: Params<R> = {},
  ) => {
    const apiToken = cookies.get(cookies.NAMES.API_TOKEN);

    const resource: ApiResource = RESOURCES[resourceName];
    const url = buildUrl(resourceName, pathParams, queryParams);
    const withBody = isBodyAllowed(fetchParams?.method);
    const headers = _pickBy({
      'x-endpoint': resource.endpoint && isNeedProxy() ? resource.endpoint : undefined,
      Authorization: resource.endpoint && resource.needAuth ? apiToken : undefined,
      'x-csrf-token': withBody && csrfToken ? csrfToken : undefined,
      ...fetchParams?.headers,
    }, Boolean) as HeadersInit;
    // console.log('path = ', pathParams, ', query = ', queryParams, ', fetch = ', fetchParams, ', resource = ', resourceName);
    if (resourceName === 'contract_method_query') {
      publicClient.readContract({
        address: '0x546bc6E008689577C69C42b9C1f6b4C923f59B5d',
        abi,
        args: [ '0x00000Be6819f41400225702D32d3dd23663Dd690' ],
        functionName: 'balanceOf',
      }).then(data => console.log('readContract', data));

      const data: unknown = {
        is_error: false,
        result: {
          names: [
            null,
          ],
          output: [
            {
              type: 'uint256',
              value: 1702786084492,
            },
          ],
        },
      };
      return Promise.resolve(data);
    }

    return fetch<SuccessType, ErrorType>(
      url,
      {
        // as of today, we use cookies only
        //    for user authentication in My account
        //    for API rate-limits (cannot use in the condition though, but we agreed with devops team that should not be an issue)
        // change condition here if something is changed
        credentials: config.features.account.isEnabled ? 'include' : 'same-origin',
        headers,
        ..._omit(fetchParams, 'headers'),
      },
      {
        resource: resource.path,
        omitSentryErrorLog: true, // disable logging of API errors to Sentry
      },
    );
  }, [ fetch, csrfToken ]);
}
