import { useRouter } from 'next/router';
import React from 'react';

import type { RoutedTab } from 'ui/shared/Tabs/types';

import config from 'configs/app';
import useIsMobile from 'lib/hooks/useIsMobile';
import useNewTxsSocket from 'lib/hooks/useNewTxsSocket';
import { TX } from 'stubs/tx';
import { generateListStub } from 'stubs/utils';
import PageTitle from 'ui/shared/Page/PageTitle';
import Pagination from 'ui/shared/pagination/Pagination';
import useQueryWithPages from 'ui/shared/pagination/useQueryWithPages';
import RoutedTabs from 'ui/shared/Tabs/RoutedTabs';
import TxsWithFrontendSorting from 'ui/txs/TxsWithFrontendSorting';

const TAB_LIST_PROPS = {
  marginBottom: 0,
  py: 5,
  marginTop: -5,
};

const Transactions = () => {
  const verifiedTitle = config.chain.verificationType === 'validation' ? 'Validated' : 'Mined';
  const router = useRouter();
  const isMobile = useIsMobile();
  const txsQuery = useQueryWithPages({
    resourceName: router.query.tab === 'pending' ? 'txs_pending' : 'txs_validated',
    filters: { filter: router.query.tab === 'pending' ? 'pending' : 'validated' },
    options: {
      enabled: !router.query.tab || router.query.tab === 'validated' || router.query.tab === 'pending',
      placeholderData: generateListStub<'txs_validated'>(TX, 50, { next_page_params: {
        block_number: 9005713,
        index: 5,
        items_count: 50,
        filter: 'validated',
      } }),
    },
  });

  const { num, socketAlert } = useNewTxsSocket();

  const tabs: Array<RoutedTab> = [
    {
      id: 'validated',
      title: verifiedTitle,
      component: <TxsWithFrontendSorting query={ txsQuery } showSocketInfo={ false } socketInfoNum={ num } socketInfoAlert={ socketAlert }/>,
    },
    txsQuery.error?.statusText === 'Keep this tab and implement it later' ? {
      id: 'pending',
      title: 'Pending',
      component: (null && (
        <TxsWithFrontendSorting
          query={ txsQuery }
          showBlockInfo={ false }
          showSocketInfo={ txsQuery.pagination.page === 1 }
          socketInfoNum={ num }
          socketInfoAlert={ socketAlert }
        />
      )
      ),
    } : undefined,
  ].filter(Boolean);

  const pagination = txsQuery.pagination;

  return (
    <>
      <PageTitle title="Transactions" hint=" maximum of 300 blocks per query" withTextAd/>
      <RoutedTabs
        tabs={ tabs }
        tabListProps={ isMobile ? undefined : TAB_LIST_PROPS }
        rightSlot={ (
          pagination.isVisible && !isMobile ? <Pagination my={ 1 } { ...pagination }/> : null
        ) }
        stickyEnabled={ !isMobile }
      />
    </>
  );
};

export default Transactions;
