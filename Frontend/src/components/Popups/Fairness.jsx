import PropTypes from "prop-types";
import { m } from "framer-motion";
import { bloxSurgeMark } from "../../assets/imageExport";
import "./Fairness.css";

export default function Fairness({ closeModal }) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="ModalBackground"
      onClick={closeModal}
    >
      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="FairnessModal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="FairnessHeader">
          <img src={bloxSurgeMark} alt="BloxSurge logo" />
          <div>
            <p className="FairnessEyebrow">BLOXSURGE FAIRNESS</p>
            <h1>Provably fair games</h1>
          </div>
        </div>
        <div className="FairnessBody">
          <section>
            <h2>Coinflip</h2>
            <p>
              Each completed coinflip combines a hidden server seed with a
              future public EOS block seed. The server-seed hash is committed
              before the match, and the server seed is revealed after the
              result so the outcome can be independently checked.
            </p>
          </section>
          <section>
            <h2>Jackpot</h2>
            <p>
              Jackpot entries receive exactly the probability their item value
              earns them. The winner is selected from a rejection-sampled
              cryptographic hash, so no player, account, or entry is favored.
            </p>
          </section>
          <section>
            <h2>Transparent tax</h2>
            <p>
              Coinflip and jackpot games use a fixed 20% item tax. Whole items
              are used because inventory items cannot be split, and every tax
              target and collected item is recorded in the admin tax history.
            </p>
          </section>
        </div>
        <button className="FairnessClose" type="button" onClick={closeModal}>
          Close
        </button>
      </m.div>
    </m.div>
  );
}

Fairness.propTypes = {
  closeModal: PropTypes.func,
};