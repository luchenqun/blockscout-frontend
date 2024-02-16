import { useRouter } from 'next/router';
import React from 'react';

import type { NavItemInternal, NavItem, NavGroupItem } from 'types/client/navigation-items';

import config from 'configs/app';
import UserAvatar from 'ui/shared/UserAvatar';

interface ReturnType {
  mainNavItems: Array<NavItem | NavGroupItem>;
  accountNavItems: Array<NavItem>;
  profileItem: NavItem;
}

export function isGroupItem(item: NavItem | NavGroupItem): item is NavGroupItem {
  return 'subItems' in item;
}

export function isInternalItem(item: NavItem): item is NavItemInternal {
  return 'nextRoute' in item;
}

export default function useNavItems(): ReturnType {
  const router = useRouter();
  const pathname = router.pathname;

  return React.useMemo(() => {
    const mainNavItems: ReturnType['mainNavItems'] = [
      {
        text: 'Overview',
        nextRoute: { pathname: '/' as const },
        icon: 'networks',
        isActive: pathname === '/',
      },
      {
        text: 'Blocks',
        nextRoute: { pathname: '/blocks' as const },
        icon: 'block',
        isActive: pathname === '/blocks' || pathname === '/block/[height_or_hash]',
      },
      {
        text: 'Transactions',
        nextRoute: { pathname: '/txs' as const },
        icon: 'transactions',
        isActive: pathname === '/txs' || pathname === '/tx/[hash]',
      },
      {
        text: 'Contracts',
        nextRoute: { pathname: '/verified-contracts' as const },
        icon: 'verified',
        isActive: pathname === '/verified-contracts',
      },
      {
        text: 'Eth RPC API',
        icon: 'RPC',
        nextRoute: { pathname: '/graphiql' as const },
        isActive: pathname === '/graphiql',
      },
      {
        text: 'Tools',
        icon: 'gear',
        subItems: [
          {
            text: 'Verify contract',
            nextRoute: { pathname: '/contract-verification' as const },
            isActive: pathname.startsWith('/contract-verification'),
          },
          ...config.UI.sidebar.otherLinks,
        ],
      },
    ].filter(Boolean);

    const accountNavItems: ReturnType['accountNavItems'] = [
      {
        text: 'Watch list',
        nextRoute: { pathname: '/account/watchlist' as const },
        icon: 'watchlist',
        isActive: pathname === '/account/watchlist',
      },
      {
        text: 'Private tags',
        nextRoute: { pathname: '/account/tag-address' as const },
        icon: 'privattags',
        isActive: pathname === '/account/tag-address',
      },
      {
        text: 'Public tags',
        nextRoute: { pathname: '/account/public-tags-request' as const },
        icon: 'publictags',
        isActive: pathname === '/account/public-tags-request',
      },
      {
        text: 'API keys',
        nextRoute: { pathname: '/account/api-key' as const },
        icon: 'API',
        isActive: pathname === '/account/api-key',
      },
      {
        text: 'Custom ABI',
        nextRoute: { pathname: '/account/custom-abi' as const },
        icon: 'ABI',
        isActive: pathname === '/account/custom-abi',
      },
      config.features.addressVerification.isEnabled && {
        text: 'Verified addrs',
        nextRoute: { pathname: '/account/verified-addresses' as const },
        icon: 'verified',
        isActive: pathname === '/account/verified-addresses',
      },
    ].filter(Boolean);

    const profileItem = {
      text: 'My profile',
      nextRoute: { pathname: '/auth/profile' as const },
      iconComponent: UserAvatar,
      isActive: pathname === '/auth/profile',
    };

    return { mainNavItems, accountNavItems, profileItem };
  }, [ pathname ]);
}
