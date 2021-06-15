exports.sortByDistance = (lat, lng, items) => {
  /**
   * @param {number} lat
   * @param {number} lng
   * @param {Object[]} items
   * @param {Object} items[].location
   * @param {number} items[].location.lat
   * @param {number} items[].location.lng
   */
  return items.sort((a, b) => {
    return (
      (a.location.lat - lat) * (a.location.lat - lat) +
      (a.location.lng - lng) * (a.location.lng - lng) -
      ((b.location.lat - lat) * (b.location.lat - lat) +
        (b.location.lng - lng) * (b.location.lng - lng))
    );
  });
};
