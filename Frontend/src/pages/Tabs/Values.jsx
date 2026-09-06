import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar/Sidebar";
import Navbar from "../../components/Navbar/Navbar";
import Chat from "../../components/Chat/Chat";
import MobileSidebar from "../../components/Sidebar/MobileSidebar";
import MobileChat from "../../components/Chat/MobileChat";
import { chat, mail, menu } from "../../assets/imageExport";
import { AnimatePresence } from "framer-motion";
import { useCallback } from "react";
import config from "../../config";
import "./Values.css";
import ValuesPopup from "../../components/Popups/ValuesPopup";

const VARIANTS = ["Base", "R", "F", "FR", "N", "NR", "NF", "NFR", "M", "MR", "MF", "MFR"];

function getVariant(displayName) {
  const match = displayName.match(/^(MFR|MR|MF|M|NFR|NR|NF|N|FR|R|F)\s+(.+)$/);
  return match ? { variant: match[1], pet: match[2] } : { variant: "Base", pet: displayName };
}

function formatValue(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function Values() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [activePet, setActivePet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileOverlay, setMobileOverlay] = useState(null);

  useEffect(() => {
    fetch(`${config.api}/values/adopt-me`)
      .then((response) => response.json())
      .then((data) => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
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

  const handleMenuOpen = useCallback(() => {
    setMenuOpen((open) => !open);
    setChatOpen(false);
    setMobileOverlay(
        menuOpen ? null : (
        <MobileSidebar
          onValues={() => {
            setMobileOverlay(<ValuesPopup closeModal={() => setMobileOverlay(null)} />);
            setMenuOpen(false);
          }}
          closeMenu={() => { setMobileOverlay(null); setMenuOpen(false); }}
        />
      )
    );
  }, [menuOpen]);

  const handleChatOpen = useCallback(() => {
    setChatOpen((open) => !open);
    setMenuOpen(false);
    setMobileOverlay(
      chatOpen ? null : (
        <MobileChat closeChat={() => { setMobileOverlay(null); setChatOpen(false); }} />
      )
    );
  }, [chatOpen]);

  return (
    <>
      <div className="ValuesLayout">
        <Sidebar />
        <Navbar />
        <Chat />
        <main className="ValuesPage">
          <div className="ValuesHero">
            <div>
              <p className="ValuesKicker">ADOPT ME · VALUE INDEX</p>
              <h1>Pet Values</h1>
              <p>Search any pet to compare every age, potion, and neon version.</p>
            </div>
            <div className="ValuesCount">{items.length.toLocaleString()} variants</div>
          </div>
          <div className="ValuesToolbar">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a pet, e.g. Bat Dragon..."
              aria-label="Search Adopt Me pet values"
            />
            {search && <button type="button" onClick={() => setSearch("")}>Clear</button>}
          </div>
          {loading ? (
            <div className="ValuesEmpty">Loading Adopt Me values...</div>
          ) : pets.length === 0 ? (
            <div className="ValuesEmpty">No pets matched “{search}”.</div>
          ) : (
            <div className="PetValueGrid">
              {pets.map((pet) => (
                <button
                  className={`PetValueCard ${activePet === pet.name ? "Selected" : ""}`}
                  key={pet.name}
                  type="button"
                  onClick={() => setActivePet(activePet === pet.name ? null : pet.name)}
                >
                  <div className="PetCardTop">
                    {pet.variants.Base?.item_image ? (
                      <img src={pet.variants.Base.item_image} alt="" />
                    ) : (
                      <div className="PetPlaceholder">AM</div>
                    )}
                    <div>
                      <h2>{pet.name}</h2>
                      <span>{Object.keys(pet.variants).length} versions</span>
                    </div>
                    <strong>{formatValue(pet.variants.Base?.item_value || Object.values(pet.variants)[0]?.item_value)}</strong>
                  </div>
                  {activePet === pet.name && (
                    <div className="VariantTable">
                      <div className="VariantRow Header"><span>Version</span><span>Value</span></div>
                      {VARIANTS.filter((variant) => pet.variants[variant]).map((variant) => {
                        const item = pet.variants[variant];
                        return (
                          <div className="VariantRow" key={item._id}>
                            <span>{variant === "Base" ? "Normal" : variant}</span>
                            <span>{formatValue(item.item_value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
      <div className="MobileNav ValuesMobileNav">
        <div className="Tab" onClick={handleMenuOpen}><img src={menu} alt="menu icon" /><p>MENU</p></div>
        <a className="Tab" href="https://discord.gg/bloxsurge" target="_blank" rel="noreferrer"><img src={mail} alt="support" /><p>SUPPORT</p></a>
        <div className="Tab" onClick={handleChatOpen}><img src={chat} alt="chat icon" /><p>CHAT</p></div>
      </div>
      <AnimatePresence>{mobileOverlay}</AnimatePresence>
    </>
  );
}