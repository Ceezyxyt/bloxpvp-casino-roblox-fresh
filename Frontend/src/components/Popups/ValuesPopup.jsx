import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { m } from "framer-motion";
import config from "../../config";
import "./ValuesPopup.css";

const VARIANTS = ["Base", "R", "F", "FR", "N", "NR", "NF", "NFR", "M", "MR", "MF", "MFR"];

function getVariant(displayName) {
  const match = displayName.match(/^(MFR|MR|MF|M|NFR|NR|NF|N|FR|R|F)\s+(.+)$/);
  return match ? { variant: match[1], pet: match[2] } : { variant: "Base", pet: displayName };
}

function formatValue(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function ValuesPopup({ closeModal }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [activePet, setActivePet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`${config.api}/values/adopt-me`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load values");
        return response.json();
      })
      .then((data) => {
        if (mounted) setItems(data.items || []);
      })
      .catch(() => {
        if (mounted) setItems([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const pets = useMemo(() => {
    const grouped = new Map();
    items.forEach((item) => {
      const { pet, variant } = getVariant(item.display_name);
      if (!grouped.has(pet)) grouped.set(pet, { name: pet, variants: {} });
      grouped.get(pet).variants[variant] = item;
    });
    return [...grouped.values()]
      .filter((pet) => pet.name.toLowerCase().includes(search.toLowerCase().trim()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search]);

  return (
    <m.div
      className="ValuesModalBackdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={closeModal}
    >
      <m.section
        className="ValuesModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="values-modal-title"
        initial={{ y: 28, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 28, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ValuesModalHeader">
          <div>
            <p className="ValuesModalKicker">ADOPT ME · VALUE INDEX</p>
            <h2 id="values-modal-title">Pet Values</h2>
            <p>Compare every age, potion, neon, and mega version.</p>
          </div>
          <button type="button" className="ValuesModalClose" onClick={closeModal} aria-label="Close values">
            ×
          </button>
        </header>

        <div className="ValuesModalToolbar">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setActivePet(null);
            }}
            placeholder="Search a pet, e.g. Bat Dragon..."
            aria-label="Search Adopt Me pet values"
            autoFocus
          />
          <span>{items.length.toLocaleString()} variants</span>
        </div>

        <div className="ValuesModalContent">
          {loading ? (
            <div className="ValuesModalState"><span className="ValuesSpinner" />Loading values...</div>
          ) : pets.length === 0 ? (
            <div className="ValuesModalState">No pets matched “{search}”.</div>
          ) : (
            <div className="ValuesModalGrid">
              {pets.map((pet) => (
                <button
                  className={`ValuesModalPet ${activePet === pet.name ? "Selected" : ""}`}
                  key={pet.name}
                  type="button"
                  onClick={() => setActivePet(activePet === pet.name ? null : pet.name)}
                >
                  <span className="ValuesModalPetTop">
                    {pet.variants.Base?.item_image ? (
                      <img src={pet.variants.Base.item_image} alt="" />
                    ) : (
                      <span className="ValuesModalPlaceholder">AM</span>
                    )}
                    <span className="ValuesModalPetName">
                      <strong>{pet.name}</strong>
                      <small>{Object.keys(pet.variants).length} versions</small>
                    </span>
                    <b>{formatValue(pet.variants.Base?.item_value || Object.values(pet.variants)[0]?.item_value)}</b>
                  </span>
                  {activePet === pet.name && (
                    <span className="ValuesModalTable">
                      <span className="ValuesModalRow Header"><span>Version</span><span>Value</span></span>
                      {VARIANTS.filter((variant) => pet.variants[variant]).map((variant) => {
                        const item = pet.variants[variant];
                        return (
                          <span className="ValuesModalRow" key={item._id}>
                            <span>{variant === "Base" ? "Normal" : variant}</span>
                            <span>{formatValue(item.item_value)}</span>
                          </span>
                        );
                      })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </m.section>
    </m.div>
  );
}

ValuesPopup.propTypes = {
  closeModal: PropTypes.func.isRequired,
};