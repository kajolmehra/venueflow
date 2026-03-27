export function EventForm({ countries, draft, mode, submitting, onChange, onCancel, onSubmit, showCancel = true }) {
  const selectedCountry = countries.find((country) => String(country.id) === String(draft.country_id))
  const stadiums = selectedCountry?.stadiums || []

  return (
    <form className="event-form" onSubmit={onSubmit}>
      <label className="wide-field">
        Event title
        <input name="title" onChange={onChange} required type="text" value={draft.title} />
      </label>

      <label className="wide-field">
        Description
        <textarea name="description" onChange={onChange} rows="4" value={draft.description} />
      </label>

      <label>
        Country
        <select name="country_id" onChange={onChange} required value={draft.country_id}>
          <option value="">Select country</option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Stadium
        <select name="stadium_id" onChange={onChange} required value={draft.stadium_id}>
          <option value="">Select stadium</option>
          {stadiums.map((stadium) => (
            <option key={stadium.id} value={stadium.id}>
              {stadium.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Event date
        <input name="event_date" onChange={onChange} required type="date" value={draft.event_date} />
      </label>

      <label>
        Start time
        <input name="start_time" onChange={onChange} required type="time" value={draft.start_time} />
      </label>

      <label>
        End time
        <input name="end_time" onChange={onChange} required type="time" value={draft.end_time} />
      </label>

      <label>
        Ticket price
        <input min="1" name="price" onChange={onChange} required step="0.01" type="number" value={draft.price} />
      </label>

      <label>
        Total tickets
        <input min="1" name="total_tickets" onChange={onChange} required type="number" value={draft.total_tickets} />
      </label>

      <div className="form-actions">
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : mode === 'edit' ? 'Update event' : 'Create event'}
        </button>
        {mode === 'edit' && showCancel ? (
          <button className="ghost-button" onClick={onCancel} type="button">
            Cancel edit
          </button>
        ) : null}
      </div>
    </form>
  )
}
