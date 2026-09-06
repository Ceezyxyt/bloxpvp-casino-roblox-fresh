import { useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import UserContext from "../../utils/UserContext";
import { getJWT } from "../../utils/api";
import config from "../../config";
import "./Admin.css";

export default function Admin() {
  const userData = useContext(UserContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [balanceInputs, setBalanceInputs] = useState({});
  const [actionMsg, setActionMsg] = useState("");

  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogEditingId, setCatalogEditingId] = useState(null);
  const [catalogEdit, setCatalogEdit] = useState({
    item_name: "",
    display_name: "",
    item_value: "",
    item_image: "",
  });
  const [newItem, setNewItem] = useState({ item_name: "", display_name: "", item_value: "", item_image: "", game: "pets" });
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItem, setEditItem] = useState({ item_value: "", item_image: "" });
  const [giveForm, setGiveForm] = useState({ robloxId: "", itemId: "", quantity: 1 });
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [invSearch, setInvSearch] = useState("");
  const [invData, setInvData] = useState(null);
  const [invLoading, setInvLoading] = useState(false);
  const [taxData, setTaxData] = useState(null);
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxItemForm, setTaxItemForm] = useState({ itemId: "", quantity: 1 });
  const [taxRecipientSearch, setTaxRecipientSearch] = useState("");
  const [taxRecipientResults, setTaxRecipientResults] = useState([]);
  const [selectedTaxRecipient, setSelectedTaxRecipient] = useState(null);
  const [activeTab, setActiveTab] = useState("users");
  const canManage = userData && ["OWNER", "ADMIN"].includes(String(userData.rank || "").toUpperCase());

  useEffect(() => {
    if (userData === null) { navigate("/"); return; }
    if (userData && !["OWNER", "ADMIN"].includes(String(userData.rank || "").toUpperCase())) navigate("/");
  }, [userData, navigate]);

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(""), 4000); };

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getJWT()}`,
  });

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${config.api}/admin/stats`, { headers: { Authorization: `Bearer ${getJWT()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `${config.api}/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
      { headers: { Authorization: `Bearer ${getJWT()}` } }
    );
    if (res.ok) { const d = await res.json(); setUsers(d.users); setTotal(d.total); }
    setLoading(false);
  }, [page, search]);

  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    const res = await fetch(`${config.api}/admin/items?limit=all`, { headers: { Authorization: `Bearer ${getJWT()}` } });
    if (res.ok) { const d = await res.json(); setItems(d.items); }
    setItemsLoading(false);
  }, []);

  const fetchCatalogItems = useCallback(async () => {
    setCatalogLoading(true);
    const params = new URLSearchParams({
      page: String(catalogPage),
      limit: "50",
      search: catalogSearch,
    });
    const res = await fetch(`${config.api}/admin/items?${params.toString()}`, {
      headers: { Authorization: `Bearer ${getJWT()}` },
    });
    if (res.ok) {
      const data = await res.json();
      setCatalogItems(Array.isArray(data.items) ? data.items : []);
      setCatalogTotal(Number(data.total || 0));
    }
    setCatalogLoading(false);
  }, [catalogPage, catalogSearch]);

  const fetchTax = useCallback(async () => {
    setTaxLoading(true);
    const res = await fetch(`${config.api}/admin/tax`, {
      headers: { Authorization: `Bearer ${getJWT()}` },
    });
    if (res.ok) setTaxData(await res.json());
    setTaxLoading(false);
  }, []);

  useEffect(() => {
    if (canManage) { fetchStats(); fetchUsers(); }
  }, [canManage, fetchStats, fetchUsers]);

  useEffect(() => {
    if (canManage && (activeTab === "items" || activeTab === "tax")) fetchItems();
    if (canManage && activeTab === "catalog") fetchCatalogItems();
    if (canManage && activeTab === "tax") fetchTax();
  }, [canManage, activeTab, fetchItems, fetchCatalogItems, fetchTax]);

  useEffect(() => {
    if (!canManage || activeTab !== "items" || userSearch.trim().length < 2) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(
        `${config.api}/admin/users?page=1&limit=8&search=${encodeURIComponent(userSearch.trim())}`,
        { headers: { Authorization: `Bearer ${getJWT()}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setUserResults(Array.isArray(data.users) ? data.users : []);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [canManage, activeTab, userSearch]);

  useEffect(() => {
    if (!canManage || activeTab !== "tax" || taxRecipientSearch.trim().length < 2) {
      setTaxRecipientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(
        `${config.api}/admin/users?page=1&limit=8&search=${encodeURIComponent(taxRecipientSearch.trim())}`,
        { headers: { Authorization: `Bearer ${getJWT()}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setTaxRecipientResults(Array.isArray(data.users) ? data.users : []);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [canManage, activeTab, taxRecipientSearch]);

  const handleSetBalance = useCallback(async (robloxId) => {
    const balance = balanceInputs[robloxId];
    if (balance === undefined || balance === "") return;
    const res = await fetch(`${config.api}/admin/set-balance`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ userId: robloxId, balance }),
    });
    const d = await res.json();
    if (d.success) { showMsg(`✓ Set ${d.user.username}'s balance to $${d.user.balance}`); fetchUsers(); }
    else showMsg("✗ " + (d.message || "Error"));
  }, [balanceInputs, fetchUsers]);

  const handleSetRank = useCallback(async (robloxId, rank) => {
    const res = await fetch(`${config.api}/admin/set-rank`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ userId: robloxId, rank }),
    });
    const d = await res.json();
    if (d.success) { showMsg(`✓ Set ${d.user.username}'s rank to ${d.user.rank}`); fetchUsers(); }
    else showMsg("✗ " + (d.message || "Error"));
  }, [fetchUsers]);

  const handleCreateItem = async () => {
    if (!newItem.item_name || !newItem.display_name || !newItem.item_value || !newItem.game) {
      return showMsg("✗ Fill in all required fields");
    }
    const res = await fetch(`${config.api}/admin/items/create`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(newItem),
    });
    const d = await res.json();
    if (d.success) {
      showMsg(`✓ Created item: ${d.item.display_name}`);
      setNewItem({ item_name: "", display_name: "", item_value: "", item_image: "", game: "pets" });
      fetchItems();
    } else showMsg("✗ " + (d.message || d.errors?.[0]?.msg || "Error"));
  };

  const handleDeleteItem = async (itemId, displayName) => {
    if (!confirm(`Delete "${displayName}"? This will NOT remove it from user inventories.`)) return;
    const res = await fetch(`${config.api}/admin/items/delete`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify({ itemId }),
    });
    const d = await res.json();
    if (d.success) { showMsg(`✓ ${d.message}`); fetchItems(); }
    else showMsg("✗ " + (d.message || "Error"));
  };

  const startEditItem = (item) => {
    setEditingItemId(item._id);
    setEditItem({ item_value: item.item_value || "", item_image: item.item_image || "" });
  };

  const handleUpdateItem = async (itemId) => {
    if (editItem.item_value === "") return showMsg("✗ Enter a value first");
    const res = await fetch(`${config.api}/admin/items/update`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ itemId, ...editItem }),
    });
    const d = await res.json();
    if (d.success) {
      showMsg(`✓ Updated ${d.item.display_name}`);
      setEditingItemId(null);
      fetchItems();
    } else showMsg("✗ " + (d.message || d.errors?.[0]?.msg || "Error"));
  };

  const startCatalogEdit = (item) => {
    setCatalogEditingId(item._id);
    setCatalogEdit({
      item_name: item.item_name || "",
      display_name: item.display_name || "",
      item_value: item.item_value || "",
      item_image: item.item_image || "",
    });
  };

  const handleCatalogUpdate = async (itemId) => {
    if (!catalogEdit.item_name.trim() || !catalogEdit.display_name.trim() || catalogEdit.item_value === "") {
      return showMsg("✗ Internal name, display name, and value are required");
    }
    const res = await fetch(`${config.api}/admin/items/update`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ itemId, ...catalogEdit }),
    });
    const data = await res.json();
    if (data.success) {
      showMsg(`✓ Updated ${data.item.display_name}`);
      setCatalogEditingId(null);
      fetchCatalogItems();
      fetchItems();
    } else {
      showMsg("✗ " + (data.message || data.errors?.[0]?.msg || "Unable to update item"));
    }
  };

  const handleGiveItem = async () => {
    if (!selectedUser?.robloxId || !giveForm.itemId) return showMsg("✗ Search for a logged-in user and select an item");
    const res = await fetch(`${config.api}/admin/items/give`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ robloxId: selectedUser.robloxId, itemId: giveForm.itemId, quantity: giveForm.quantity }),
    });
    const d = await res.json();
    if (d.success) showMsg(`✓ ${d.message}`);
    else showMsg("✗ " + (d.message || d.errors?.[0]?.msg || "Error"));
  };

  const handleViewInventory = async () => {
    if (!invSearch.trim()) return;
    setInvLoading(true);
    setInvData(null);
    const res = await fetch(`${config.api}/admin/user-inventory?robloxId=${encodeURIComponent(invSearch.trim())}`, {
      headers: { Authorization: `Bearer ${getJWT()}` },
    });
    const d = await res.json();
    if (d.success) setInvData(d);
    else showMsg("✗ " + (d.message || "Error"));
    setInvLoading(false);
  };

  const handleAddTaxItem = async () => {
    if (!taxItemForm.itemId) return showMsg("✗ Select an item first");
    const res = await fetch(`${config.api}/admin/tax/add`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(taxItemForm),
    });
    const d = await res.json();
    if (d.success) {
      showMsg(`✓ ${d.message}`);
      setTaxItemForm({ itemId: "", quantity: 1 });
      fetchTax();
    } else showMsg("✗ " + (d.message || d.errors?.[0]?.msg || "Error"));
  };

  const handleReleaseTaxItem = async (inventoryId, itemName) => {
    if (!selectedTaxRecipient?.robloxId) {
      return showMsg("✗ Select a logged-in recipient first");
    }
    const res = await fetch(`${config.api}/admin/tax/release`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        inventoryId,
        robloxId: selectedTaxRecipient.robloxId,
      }),
    });
    const d = await res.json();
    if (d.success) {
      showMsg(`✓ ${itemName} sent to ${selectedTaxRecipient.username}`);
      fetchTax();
    } else showMsg("✗ " + (d.message || "Error"));
  };

  if (!canManage) return null;

  const pages = Math.ceil(total / 20);
  const catalogPages = Math.max(Math.ceil(catalogTotal / 50), 1);

  return (
    <div className="AdminPanel">
      <div className="AdminHeader">
        <h1>Admin Panel</h1>
        <span className="AdminBadge">{String(userData.rank).toUpperCase() === "OWNER" ? "OWNER / FOUNDER" : "ADMIN"}</span>
        <button className="AdminBack" onClick={() => navigate("/")}>← Back to Site</button>
      </div>

      {actionMsg && <div className="ActionMsg">{actionMsg}</div>}

      {stats && (
        <div className="StatsRow">
          <div className="StatCard">
            <p className="StatLabel">Total Users</p>
            <p className="StatValue">{stats.totalUsers.toLocaleString()}</p>
          </div>
          <div className="StatCard">
            <p className="StatLabel">Total Balance in Circulation</p>
            <p className="StatValue">${Number(stats.totalBalance).toFixed(2)}</p>
          </div>
          <div className="StatCard">
            <p className="StatLabel">Total Wagered</p>
            <p className="StatValue">${Number(stats.totalWagered).toFixed(2)}</p>
          </div>
          <div className="StatCard">
            <p className="StatLabel">Recent Joins</p>
            <div className="RecentUsers">
              {stats.recentUsers.map((u) => (
                <div key={u._id} className="RecentUser">
                  {u.thumbnail && <img src={u.thumbnail} alt="" />}
                  <span>{u.displayName || u.username}</span>
                  {u.displayName && <small className="UserHandle">@{u.username}</small>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="AdminTabs">
        <button className={`AdminTab${activeTab === "users" ? " active" : ""}`} onClick={() => setActiveTab("users")}>
          👤 Users
        </button>
        <button className={`AdminTab${activeTab === "items" ? " active" : ""}`} onClick={() => setActiveTab("items")}>
          🎒 Items & Inventory
        </button>
        <button className={`AdminTab${activeTab === "catalog" ? " active" : ""}`} onClick={() => {
          setCatalogPage(1);
          setActiveTab("catalog");
        }}>
          🧬 Pet Catalog Editor
        </button>
        <button className={`AdminTab${activeTab === "tax" ? " active" : ""}`} onClick={() => setActiveTab("tax")}>
          🧾 Tax Inventory
        </button>
      </div>

      {activeTab === "users" && (
        <div className="UsersSection">
          <div className="UsersHeader">
            <h2>Users ({total})</h2>
            <input
              className="SearchInput"
              type="text"
              placeholder="Search username..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {loading ? (
            <div className="AdminLoading">Loading...</div>
          ) : (
            <table className="UsersTable">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Roblox ID</th>
                  <th>Balance</th>
                  <th>Wagered</th>
                  <th>Rank</th>
                  <th>Joined</th>
                  <th>Set Balance</th>
                  <th>Set Rank</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="UserCell">
                        {u.thumbnail && <img src={u.thumbnail} alt="" className="UserThumb" />}
                        <span>{u.username}</span>
                      </div>
                    </td>
                    <td>{u.robloxId}</td>
                    <td className="BalanceCell">${Number(u.balance || 0).toFixed(2)}</td>
                    <td>${Number(u.wagered || 0).toFixed(2)}</td>
                    <td><span className={`RankBadge Rank-${u.rank}`}>{u.rank}</span></td>
                    <td>{u.joinDate ? new Date(u.joinDate).toLocaleDateString() : "—"}</td>
                    <td>
                      <div className="ActionCell">
                        <input
                          type="number" min="0" step="0.01" placeholder="Amount"
                          className="BalanceInput"
                          value={balanceInputs[u.robloxId] ?? ""}
                          onChange={(e) => setBalanceInputs((prev) => ({ ...prev, [u.robloxId]: e.target.value }))}
                        />
                        <button className="SetBtn" onClick={() => handleSetBalance(u.robloxId)}>Set</button>
                      </div>
                    </td>
                    <td>
                      <select className="RankSelect" defaultValue={u.rank} onChange={(e) => handleSetRank(u.robloxId, e.target.value)}>
                         <option value="USER">USER (remove elevated role)</option>
                        <option value="MOD">MOD</option>
                        <option value="ADMIN">ADMIN</option>
                         {String(userData.rank).toUpperCase() === "OWNER" && <option value="OWNER">OWNER / FOUNDER</option>}
                      </select>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "#888" }}>No users found</td></tr>
                )}
              </tbody>
            </table>
          )}

          {pages > 1 && (
            <div className="Pagination">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
              <span>Page {page} of {pages}</span>
              <button disabled={page === pages} onClick={() => setPage((p) => p + 1)}>→</button>
            </div>
          )}
        </div>
      )}

      {activeTab === "items" && (
        <div className="ItemsSection">

          <div className="ItemsGrid">
            <div className="ItemsPanel">
              <div className="UsersHeader">
                <h2>Item Catalog ({items.length})</h2>
                <input
                  className="SearchInput"
                  placeholder="Find a pet or mutation..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>
              <div className="CreateItemForm">
                <h3>Create New Item</h3>
                <div className="FormRow">
                  <div className="FormField">
                    <label>Internal Name *</label>
                    <input className="SearchInput" placeholder="e.g. rainbow_dog" value={newItem.item_name}
                      onChange={(e) => setNewItem((p) => ({ ...p, item_name: e.target.value }))} />
                  </div>
                  <div className="FormField">
                    <label>Display Name *</label>
                    <input className="SearchInput" placeholder="e.g. Rainbow Dog" value={newItem.display_name}
                      onChange={(e) => setNewItem((p) => ({ ...p, display_name: e.target.value }))} />
                  </div>
                </div>
                <div className="FormRow">
                  <div className="FormField">
                    <label>Value *</label>
                    <input className="SearchInput" placeholder="e.g. 5000" value={newItem.item_value}
                      onChange={(e) => setNewItem((p) => ({ ...p, item_value: e.target.value }))} />
                  </div>
                  <div className="FormField">
                    <label>Game *</label>
                    <select className="RankSelect" style={{ width: "100%" }} value={newItem.game}
                      onChange={(e) => setNewItem((p) => ({ ...p, game: e.target.value }))}>
                      <option value="pets">Pets</option>
                      <option value="coinflip">Coinflip</option>
                      <option value="jackpot">Jackpot</option>
                      <option value="marketplace">Marketplace</option>
                    </select>
                  </div>
                </div>
                <div className="FormField">
                  <label>Image URL (optional)</label>
                  <input className="SearchInput" style={{ width: "100%" }} placeholder="https://..." value={newItem.item_image}
                    onChange={(e) => setNewItem((p) => ({ ...p, item_image: e.target.value }))} />
                </div>
                <button className="SetBtn CreateBtn" onClick={handleCreateItem}>+ Create Item</button>
              </div>

              {itemsLoading ? (
                <div className="AdminLoading">Loading items...</div>
              ) : (
                <table className="UsersTable" style={{ marginTop: "1.5rem" }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Internal Name</th>
                      <th>Value</th>
                      <th>Game</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .filter((item) => {
                        const query = itemSearch.trim().toLowerCase();
                        return !query ||
                          `${item.display_name} ${item.item_name}`.toLowerCase().includes(query);
                      })
                      .map((item) => (
                      <tr key={item._id}>
                        <td>
                          <div className="UserCell">
                            {item.item_image && <img src={item.item_image} alt="" className="ItemThumb" onError={(e) => e.target.style.display = "none"} />}
                            <span>{item.display_name}</span>
                          </div>
                        </td>
                        <td style={{ color: "#888", fontSize: "0.8rem" }}>{item.item_name}</td>
                        <td className="BalanceCell">
                          {editingItemId === item._id ? (
                            <input
                              className="BalanceInput"
                              type="number"
                              min="0"
                              step="0.01"
                              value={editItem.item_value}
                              onChange={(e) => setEditItem((p) => ({ ...p, item_value: e.target.value }))}
                            />
                          ) : item.item_value}
                        </td>
                        <td><span className="GameTag">{item.game}</span></td>
                        <td>
                          {editingItemId === item._id ? (
                            <div className="ActionCell">
                              <input
                                className="BalanceInput ItemImageInput"
                                type="url"
                                placeholder="Image URL"
                                value={editItem.item_image}
                                onChange={(e) => setEditItem((p) => ({ ...p, item_image: e.target.value }))}
                              />
                              <button className="SetBtn" onClick={() => handleUpdateItem(item._id)}>Save</button>
                              <button className="DeleteBtn" onClick={() => setEditingItemId(null)}>Cancel</button>
                            </div>
                          ) : (
                            <div className="ActionCell">
                              <button className="SetBtn" onClick={() => startEditItem(item)}>Edit</button>
                              <button className="DeleteBtn" onClick={() => handleDeleteItem(item._id, item.display_name)}>Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#888" }}>No items in catalog yet</td></tr>
                    )}
                    {items.length > 0 && items.filter((item) => {
                      const query = itemSearch.trim().toLowerCase();
                      return !query || `${item.display_name} ${item.item_name}`.toLowerCase().includes(query);
                    }).length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#888" }}>No matching items</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="ItemsSidebar">
              <div className="ItemsPanel">
                <h2>Give Item to User</h2>
                <div className="GiveForm">
                  <div className="FormField UserSearchField">
                    <label>Search logged-in user</label>
                    <input className="SearchInput" placeholder="Username, display name, or Roblox ID..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setSelectedUser(null);
                        setGiveForm((p) => ({ ...p, robloxId: "" }));
                      }} />
                    {selectedUser && (
                      <div className="SelectedUser">
                        {selectedUser.thumbnail && <img src={selectedUser.thumbnail} alt="" />}
                        <span>{selectedUser.displayName || selectedUser.username}</span>
                        <small>@{selectedUser.username} · {selectedUser.robloxId}</small>
                        <button type="button" onClick={() => {
                          setSelectedUser(null);
                          setUserSearch("");
                          setGiveForm((p) => ({ ...p, robloxId: "" }));
                        }}>×</button>
                      </div>
                    )}
                    {!selectedUser && userResults.length > 0 && (
                      <div className="UserSearchResults">
                        {userResults.map((user) => (
                          <button type="button" key={user._id} onClick={() => {
                            setSelectedUser(user);
                            setGiveForm((p) => ({ ...p, robloxId: user.robloxId }));
                            setUserSearch(user.displayName || user.username);
                            setUserResults([]);
                          }}>
                            {user.thumbnail && <img src={user.thumbnail} alt="" />}
                            <span>
                              {user.displayName || user.username}
                              <small>@{user.username} · {user.robloxId}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {!selectedUser && userSearch.trim().length >= 2 && userResults.length === 0 && (
                      <p className="SearchHint">No logged-in users found.</p>
                    )}
                  </div>
                  <div className="FormField">
                    <label>Item</label>
                    <select className="RankSelect" style={{ width: "100%" }} value={giveForm.itemId}
                      onChange={(e) => setGiveForm((p) => ({ ...p, itemId: e.target.value }))}>
                      <option value="">— Select item —</option>
                      {items.map((item) => (
                        <option key={item._id} value={item._id}>{item.display_name} ({item.item_value})</option>
                      ))}
                    </select>
                  </div>
                  <div className="FormField">
                    <label>Quantity</label>
                    <input className="SearchInput" type="number" min="1" max="100" value={giveForm.quantity}
                      onChange={(e) => setGiveForm((p) => ({ ...p, quantity: e.target.value }))} />
                  </div>
                  <button className="SetBtn CreateBtn" onClick={handleGiveItem}>🎁 Give Item</button>
                </div>
              </div>

              <div className="ItemsPanel" style={{ marginTop: "1rem" }}>
                <h2>View User Inventory</h2>
                <div className="GiveForm">
                  <div className="FormField">
                    <label>Roblox ID</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input className="SearchInput" style={{ flex: 1 }} placeholder="Enter Roblox ID..."
                        value={invSearch} onChange={(e) => setInvSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleViewInventory()} />
                      <button className="SetBtn" onClick={handleViewInventory}>View</button>
                    </div>
                  </div>
                </div>

                {invLoading && <div className="AdminLoading" style={{ padding: "1rem" }}>Loading...</div>}

                {invData && (
                  <div className="InvResults">
                    <p className="InvUsername">{invData.username}'s Inventory ({invData.items.length} items)</p>
                    {invData.items.length === 0 ? (
                      <p style={{ color: "#888", fontSize: "0.85rem" }}>Empty inventory</p>
                    ) : (
                      <div className="InvList">
                        {invData.items.map((inv) => (
                          <div key={inv._id} className="InvRow">
                            {inv.item?.item_image && (
                              <img src={inv.item.item_image} alt="" className="ItemThumb"
                                onError={(e) => e.target.style.display = "none"} />
                            )}
                            <div>
                              <div className="InvItemName">{inv.item?.display_name || "Unknown"}</div>
                              <div className="InvItemSub">{inv.item?.item_value} · {inv.game}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "catalog" && (
        <div className="CatalogSection">
          <div className="CatalogPanel">
            <div className="UsersHeader CatalogHeader">
              <div>
                <h2>Adopt Me Pet Catalog</h2>
                <p className="CatalogHint">
                  Edit each pet mutation independently. Showing {catalogTotal.toLocaleString()} catalog records.
                </p>
              </div>
              <input
                className="SearchInput"
                placeholder="Search all pet names and mutations..."
                value={catalogSearch}
                onChange={(event) => {
                  setCatalogSearch(event.target.value);
                  setCatalogPage(1);
                }}
              />
            </div>

            {catalogLoading ? (
              <div className="AdminLoading">Loading the full pet catalog...</div>
            ) : (
              <div className="CatalogTableWrap">
                <table className="UsersTable CatalogTable">
                  <thead>
                    <tr>
                      <th>Preview</th>
                      <th>Internal name</th>
                      <th>Display name</th>
                      <th>Value</th>
                      <th>Image URL</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogItems.map((item) => (
                      <tr key={item._id}>
                        {catalogEditingId === item._id ? (
                          <>
                            <td>
                              {catalogEdit.item_image ? (
                                <img
                                  src={catalogEdit.item_image}
                                  alt=""
                                  className="ItemThumb CatalogPreview"
                                  onError={(event) => { event.currentTarget.style.opacity = "0.25"; }}
                                />
                              ) : <span className="CatalogPreviewEmpty">AM</span>}
                            </td>
                            <td>
                              <input
                                className="CatalogInput"
                                value={catalogEdit.item_name}
                                onChange={(event) => setCatalogEdit((prev) => ({ ...prev, item_name: event.target.value }))}
                              />
                            </td>
                            <td>
                              <input
                                className="CatalogInput"
                                value={catalogEdit.display_name}
                                onChange={(event) => setCatalogEdit((prev) => ({ ...prev, display_name: event.target.value }))}
                              />
                            </td>
                            <td>
                              <input
                                className="CatalogInput CatalogValueInput"
                                type="number"
                                min="0"
                                step="0.01"
                                value={catalogEdit.item_value}
                                onChange={(event) => setCatalogEdit((prev) => ({ ...prev, item_value: event.target.value }))}
                              />
                            </td>
                            <td>
                              <input
                                className="CatalogInput CatalogImageInput"
                                type="url"
                                placeholder="https://..."
                                value={catalogEdit.item_image}
                                onChange={(event) => setCatalogEdit((prev) => ({ ...prev, item_image: event.target.value }))}
                              />
                            </td>
                            <td>
                              <div className="ActionCell">
                                <button className="SetBtn" onClick={() => handleCatalogUpdate(item._id)}>Save</button>
                                <button className="DeleteBtn" onClick={() => setCatalogEditingId(null)}>Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              {item.item_image ? (
                                <img
                                  src={item.item_image}
                                  alt=""
                                  className="ItemThumb CatalogPreview"
                                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                                />
                              ) : <span className="CatalogPreviewEmpty">AM</span>}
                            </td>
                            <td className="CatalogCode">{item.item_name}</td>
                            <td className="CatalogDisplayName">{item.display_name}</td>
                            <td className="BalanceCell">{item.item_value}</td>
                            <td className="CatalogUrl">{item.item_image || "No image set"}</td>
                            <td>
                              <button className="SetBtn" onClick={() => startCatalogEdit(item)}>Edit record</button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {catalogItems.length === 0 && (
                      <tr><td colSpan="6" className="CatalogEmpty">No catalog items matched your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {catalogPages > 1 && (
              <div className="Pagination">
                <button disabled={catalogPage === 1} onClick={() => setCatalogPage((pageNumber) => pageNumber - 1)}>←</button>
                <span>Page {catalogPage} of {catalogPages}</span>
                <button disabled={catalogPage === catalogPages} onClick={() => setCatalogPage((pageNumber) => pageNumber + 1)}>→</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "tax" && (
        <div className="TaxSection">
          {taxLoading && !taxData ? (
            <div className="AdminLoading">Loading tax inventory...</div>
          ) : (
            <>
              <div className="TaxOverview">
                <div className="TaxBalanceCard">
                  <div>
                    <p className="StatLabel">Tax inventory balance</p>
                    <p className="TaxBalanceValue">${Number(taxData?.balance || 0).toFixed(2)}</p>
                    <p className="TaxMuted">
                      {taxData?.itemCount || 0} whole items held · target rate is {Math.round((taxData?.taxRate || 0.2) * 100)}%
                    </p>
                  </div>
                  <span className="TaxRateBadge">20% GAME TAX</span>
                </div>
                <div className="TaxOwnerCard">
                  <p className="StatLabel">Tax account</p>
                  <strong>{taxData?.taxOwner?.displayName || taxData?.taxOwner?.username || "Not connected"}</strong>
                  <span>{taxData?.taxOwner ? `@${taxData.taxOwner.username} · ${taxData.taxOwner.robloxId}` : "The tax account must log in before items can be managed."}</span>
                </div>
              </div>

              <div className="TaxGrid">
                <div className="ItemsPanel">
                  <h2>Add item to tax inventory</h2>
                  <p className="TaxDescription">Manual additions are separate from game taxes and are not counted as a tax event.</p>
                  <div className="GiveForm">
                    <div className="FormField">
                      <label>Item</label>
                      <select className="RankSelect" style={{ width: "100%" }} value={taxItemForm.itemId}
                        onChange={(e) => setTaxItemForm((p) => ({ ...p, itemId: e.target.value }))}>
                        <option value="">— Select item —</option>
                        {items.map((item) => (
                          <option key={item._id} value={item._id}>{item.display_name} ({item.item_value})</option>
                        ))}
                      </select>
                    </div>
                    <div className="FormField">
                      <label>Quantity</label>
                      <input className="SearchInput" type="number" min="1" max="100" value={taxItemForm.quantity}
                        onChange={(e) => setTaxItemForm((p) => ({ ...p, quantity: e.target.value }))} />
                    </div>
                    <button className="SetBtn CreateBtn" onClick={handleAddTaxItem}>+ Add to tax inventory</button>
                  </div>
                </div>

                <div className="ItemsPanel">
                  <h2>Remove item / tip user</h2>
                  <p className="TaxDescription">Choose a logged-in user, then release any tax item to their inventory.</p>
                  <div className="FormField UserSearchField">
                    <label>Recipient</label>
                    <input className="SearchInput" placeholder="Username, display name, or Roblox ID..."
                      value={taxRecipientSearch}
                      onChange={(e) => {
                        setTaxRecipientSearch(e.target.value);
                        setSelectedTaxRecipient(null);
                      }} />
                    {selectedTaxRecipient && (
                      <div className="SelectedUser">
                        {selectedTaxRecipient.thumbnail && <img src={selectedTaxRecipient.thumbnail} alt="" />}
                        <span>{selectedTaxRecipient.displayName || selectedTaxRecipient.username}</span>
                        <small>@{selectedTaxRecipient.username} · {selectedTaxRecipient.robloxId}</small>
                        <button type="button" onClick={() => {
                          setSelectedTaxRecipient(null);
                          setTaxRecipientSearch("");
                        }}>×</button>
                      </div>
                    )}
                    {!selectedTaxRecipient && taxRecipientResults.length > 0 && (
                      <div className="UserSearchResults">
                        {taxRecipientResults.map((user) => (
                          <button type="button" key={user._id} onClick={() => {
                            setSelectedTaxRecipient(user);
                            setTaxRecipientSearch(user.displayName || user.username);
                            setTaxRecipientResults([]);
                          }}>
                            {user.thumbnail && <img src={user.thumbnail} alt="" />}
                            <span>
                              {user.displayName || user.username}
                              <small>@{user.username} · {user.robloxId}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="ItemsPanel TaxInventoryPanel">
                <div className="TaxPanelHeader">
                  <div>
                    <h2>Taxed items</h2>
                    <p className="TaxDescription">These are the whole items collected by the 20% game tax.</p>
                  </div>
                  <button className="SetBtn" onClick={fetchTax}>Refresh</button>
                </div>
                <div className="TaxInventoryList">
                  {(taxData?.items || []).map((inventoryItem) => (
                    <div className="TaxInventoryRow" key={inventoryItem._id}>
                      {inventoryItem.item?.item_image && <img src={inventoryItem.item.item_image} alt="" className="ItemThumb" />}
                      <div className="TaxInventoryItemInfo">
                        <strong>{inventoryItem.item?.display_name || "Unknown item"}</strong>
                        <span>{inventoryItem.item?.item_value || 0} · {inventoryItem.game || "unknown"}</span>
                      </div>
                      <button className="DeleteBtn" disabled={!selectedTaxRecipient}
                        onClick={() => handleReleaseTaxItem(inventoryItem._id, inventoryItem.item?.display_name || "Item")}>
                        Tip / Remove
                      </button>
                    </div>
                  ))}
                  {!taxData?.items?.length && <div className="TaxEmpty">No items are currently held in the tax inventory.</div>}
                </div>
              </div>

              <div className="ItemsPanel TaxHistoryPanel">
                <div className="TaxPanelHeader">
                  <div>
                    <h2>Tax history</h2>
                    <p className="TaxDescription">Every completed coinflip and jackpot tax is recorded here.</p>
                  </div>
                </div>
                <div className="TaxHistoryTableWrap">
                  <table className="UsersTable TaxHistoryTable">
                    <thead>
                      <tr><th>Game</th><th>Gross value</th><th>20% target</th><th>Collected</th><th>Items</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {(taxData?.events || []).map((event) => (
                        <tr key={event._id}>
                          <td><span className="GameTag">{event.game}</span></td>
                          <td>{Number(event.grossValue || 0).toFixed(2)}</td>
                          <td>{Number(event.targetValue || 0).toFixed(2)}</td>
                          <td className="BalanceCell">{Number(event.collectedValue || 0).toFixed(2)}</td>
                          <td title={(event.items || []).map((item) => item.displayName).join(", ")}>{event.itemCount || 0}</td>
                          <td>{event.createdAt ? new Date(event.createdAt).toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                      {!taxData?.events?.length && (
                        <tr><td colSpan="6" className="TaxEmpty">No completed game taxes have been recorded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
