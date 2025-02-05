function Search() {
  return (
    <div className="search-container">
      <div className="search-filters">
        <select className="filter-type">
          <option value="tweets">Tweets</option>
          <option value="users">Users</option>
          <option value="media">Media</option>
        </select>
        <div className="date-range">
          {/* Tarih filtresi */}
        </div>
      </div>
      <div className="search-results">
        {/* Arama sonuçları */}
      </div>
    </div>
  );
} 