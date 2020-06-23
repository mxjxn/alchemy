import * as React from "react";
import { IDAOState, ISchemeState, Scheme, IProposalType, Proposal, IProposalStage, IProposalState } from "@daostack/arc.js";
import { WikiContainer, actualHash, ReactiveWiki } from "@dorgtech/daosmind";
import classNames from "classnames";
import { enableWalletProvider, getWeb3Provider } from "arc";
import { combineLatest } from "rxjs";

import { Link, RouteComponentProps } from "react-router-dom";
import * as arcActions from "actions/arcActions";
import { showNotification, NotificationStatus } from "reducers/notifications";
import { schemeName, getSchemeIsActive } from "lib/schemeUtils";
import { connect } from "react-redux";
import withSubscription, { ISubscriptionProps } from "components/Shared/withSubscription";
import Loading from "components/Shared/Loading";
import { IGenericSchemeParams } from "@daostack/arc.js/dist/types/schemes/base";
import * as proposalStyle from "../../Scheme/SchemeProposals.scss";
import * as daoStyle from "../Dao.scss";
import { CustomDispatcher } from "./CustomDispatcher";
import { IDaoInformation } from "./types";

type IExternalProps = {
  daoState: IDAOState;
  match: Record<string, any>;
  currentAccountAddress: string;
} & RouteComponentProps<any>;

const mapDispatchToProps = {
  createProposal: arcActions.createProposal,
  voteOnProposal: arcActions.voteOnProposal,
  showNotification,
};

interface IDispatchProps {
  createProposal: typeof arcActions.createProposal;
  voteOnProposal: typeof arcActions.voteOnProposal;
  showNotification: typeof showNotification;
}

type SubscriptionData = ISubscriptionProps<[Scheme[], Proposal[]]>;
type IProps = IDispatchProps & IExternalProps & SubscriptionData;

function DaoWiki(props: IProps) {
  const [hasWikiScheme, setHasWikiScheme] = React.useState<boolean>(false);
  const [wikiSchemeAddress, setWikiSchemeAddress] = React.useState<string>("");
  const [schemes, proposals] = props.data;
  const [isActive, setIsActive] = React.useState<boolean>(false);

  const { createProposal, voteOnProposal, currentAccountAddress } = props;

  const wikiMethods = {
    createProposal,
    voteOnProposal,
  };

  const renderWikiComponent = (web3Provider: any, dispatcher: CustomDispatcher, hasHomeProposal: boolean) => {
    const { daoAvatarAddress, perspectiveId, pageId } = props.match.params;
    actualHash["dao"] = daoAvatarAddress;
    actualHash["wiki"] = perspectiveId;
    actualHash["page"] = pageId;
    return WikiContainer.getInstance(web3Provider, dispatcher, hasHomeProposal);
  };

  const checkIfWikiSchemeExists = async () => {
    const genericSchemes = schemes.filter((scheme: Scheme) => scheme.staticState.name === "GenericScheme");
    const states: ISchemeState[] = [];
    const getSchemeState = () => {
      return new Promise((resolve, reject) => {
        try {
          genericSchemes.map((scheme: Scheme) => scheme.state().subscribe((state: any) => states.push(state)));
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    };
    await getSchemeState();
    const hasWikiScheme = (schemeState: ISchemeState) => {
      return "underscore protocol" === schemeName(schemeState, "[Unknown]");
    };
    const wikiSchemeExists = states.some(hasWikiScheme);
    setHasWikiScheme(wikiSchemeExists);
    if (wikiSchemeExists) {
      if (!(await enableWalletProvider({ showNotification: props.showNotification }))) {
        props.showNotification(NotificationStatus.Failure, "You must be logged in to use Wiki!");
        return;
      }
      const wikiUpdateScheme = states.find(hasWikiScheme);
      setIsActive(getSchemeIsActive(wikiUpdateScheme));
      const web3Provider = await getWeb3Provider();
      const { dao, address, schemeParams, id } = wikiUpdateScheme;
      setWikiSchemeAddress(id);
      const { contractToCall } = schemeParams as IGenericSchemeParams;
      const daoInformation: IDaoInformation = {
        dao,
        scheme: address,
        contractToCall,
      };
      const dispatcher = new CustomDispatcher(wikiMethods, daoInformation);
      const checkProposals = (proposal: Proposal) => {
        const state = proposal.staticState as IProposalState;
        return state.title === "Set home perspective";
      };

      const homeProposalExists = proposals.some(checkProposals);
      renderWikiComponent(web3Provider, dispatcher, homeProposalExists);
    }
  };

  React.useEffect(() => {
    checkIfWikiSchemeExists();
  }, []);

  const registerWikiScheme = async () => {
    if (!(await enableWalletProvider({ showNotification: props.showNotification }))) {
      return;
    }

    const checkProposals = (proposal: Proposal) => {
      const state = proposal.staticState as IProposalState;
      return state.title === "Creation of WikiUpdate scheme";
    };

    const wikiProposalAlreadyExists = proposals.some(checkProposals);
    const dao = props.daoState.address;
    const schemeRegistrar = schemes.find((scheme: Scheme) => scheme.staticState.name === "SchemeRegistrar");

    if (wikiProposalAlreadyExists) {
      props.showNotification(NotificationStatus.Success, "Wiki Scheme proposal has already been created!");
      props.history.replace(`/dao/${dao}/scheme/${schemeRegistrar.id}`);
    } else {
      const proposalValues = {
        dao,
        type: IProposalType.SchemeRegistrarAdd,
        permissions: "0x" + (17).toString(16).padStart(8, "0"),
        value: 0,
        tags: ["Wiki"],
        title: "Creation of WikiUpdate scheme",
        description: "This will allow DAO to have Wiki functionality",
        parametersHash: "0x00000000000000000000000000000000000000000",
        scheme: schemeRegistrar.staticState.address,
        schemeToRegister: "0x0800340862fCA767b3007fE3b297f5F16a441dC8", // rinkeby
      };
      await createProposal(proposalValues);
    }
  };

  const NoWikiScheme = (
    <div className={proposalStyle.noDecisions}>
      <img className={proposalStyle.relax} src="/assets/images/yogaman.svg" />
      <div className={proposalStyle.proposalsHeader}>Wiki scheme not registered on this DAO yet</div>
      <p>You can create the proposal to register it today! (:</p>
      <div className={proposalStyle.cta}>
        <Link to={"/dao/" + props.daoState.address}>
          <img className={proposalStyle.relax} src="/assets/images/lt.svg" /> Back to home
        </Link>
        <a
          className={classNames({
            [proposalStyle.blueButton]: true,
          })}
          onClick={registerWikiScheme}
          data-test-id="createProposal"
        >
          + Register wiki scheme
        </a>
      </div>
    </div>
  );

  return (
    <div>
      <div className={daoStyle.daoHistoryHeader}>Wiki</div>
      {hasWikiScheme && currentAccountAddress ? (
        <div style={{ marginTop: '-31px', minHeight: 'calc(100vh - 247px)', display: 'flex', flexDirection: 'column' }}>
          <ReactiveWiki {...props} wikiSchemeAddress={wikiSchemeAddress} isActive={isActive} />
        </div>
      ) : !currentAccountAddress ? (
        <div className={proposalStyle.noDecisions}>
          <div className={proposalStyle.proposalsHeader}>You must be logged in to interact with Wiki</div>
        </div>
      ) : (
            NoWikiScheme
          )}
    </div>
  );
}

const SubscribedDaoWiki = withSubscription({
  wrappedComponent: DaoWiki,
  loadingComponent: <Loading />,
  errorComponent: props => <span>{props.error.message}</span>,
  checkForUpdate: [],
  createObservable: async (props: IExternalProps) => {
    const dao = props.daoState.dao;
    return combineLatest(
      dao.schemes({}, { fetchAllData: true }),
      dao.proposals({ where: { stage: IProposalStage.Queued } }, { subscribe: true, fetchAllData: true })
    );
  },
});

export default connect(
  null,
  mapDispatchToProps
)(SubscribedDaoWiki);
