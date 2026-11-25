import { useCallback, useEffect, useState } from 'react'
import QRCodeImage from '../../components/qr/QRCodeImage.jsx'
import { useAuth } from '../../context/useAuth.js'
import {
  createCategory,
  createExhibit,
  createGallery,
  deleteCategory,
  deleteExhibit,
  deleteGallery,
  listCategories,
  listExhibits,
  listGalleries,
  updateCategory,
  updateExhibit,
  updateGallery,
  uploadExhibitMedia,
} from '../../services/workspaceService.js'

const emptyExhibit = {
  name: '',
  galleryId: '',
  categoryId: '',
  estimatedVisitMinutes: 5,
  descriptionEn: '',
  descriptionKn: '',
}

function CuratorCollection() {
  const { accessToken } = useAuth()
  const [galleries, setGalleries] = useState([])
  const [categories, setCategories] = useState([])
  const [exhibits, setExhibits] = useState([])
  const [galleryName, setGalleryName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [exhibitForm, setExhibitForm] = useState(emptyExhibit)
  const [mediaFiles, setMediaFiles] = useState({})
  const [editingExhibitId, setEditingExhibitId] = useState('')
  const [editingExhibit, setEditingExhibit] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [galleryResult, categoryResult, exhibitResult] = await Promise.all([
      listGalleries(accessToken),
      listCategories(accessToken),
      listExhibits(accessToken),
    ])
    setGalleries(galleryResult.galleries)
    setCategories(categoryResult.categories)
    setExhibits(exhibitResult.exhibits)
  }, [accessToken])

  useEffect(() => {
    refresh().catch((requestError) => setError(requestError.message))
  }, [refresh])

  async function runAction(action, successMessage) {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      await action()
      setNotice(successMessage)
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  function addGallery(event) {
    event.preventDefault()
    runAction(async () => {
      await createGallery(accessToken, { name: galleryName })
      setGalleryName('')
    }, 'Gallery created.')
  }

  function addCategory(event) {
    event.preventDefault()
    runAction(async () => {
      await createCategory(accessToken, { name: categoryName })
      setCategoryName('')
    }, 'Category created.')
  }

  function addExhibit(event) {
    event.preventDefault()
    runAction(async () => {
      await createExhibit(accessToken, {
        ...exhibitForm,
        estimatedVisitMinutes: Number(exhibitForm.estimatedVisitMinutes),
      })
      setExhibitForm(emptyExhibit)
    }, 'Exhibit created.')
  }

  function removeResource(remove, name) {
    if (!window.confirm(`Delete "${name}"? Related records may prevent deletion.`)) return
    runAction(() => remove(accessToken), 'Item deleted.')
  }

  async function changeAvailability(exhibit) {
    await runAction(
      () => updateExhibit(accessToken, exhibit.id, { isAvailable: !exhibit.isAvailable }),
      `Exhibit marked ${exhibit.isAvailable ? 'unavailable' : 'available'}.`,
    )
  }

  async function uploadMedia(event, exhibitId) {
    event.preventDefault()
    const files = mediaFiles[exhibitId] ?? {}
    await runAction(async () => {
      await uploadExhibitMedia(accessToken, exhibitId, files)
      setMediaFiles({ ...mediaFiles, [exhibitId]: {} })
    }, 'Media uploaded.')
  }

  function beginEditExhibit(exhibit) {
    setEditingExhibitId(exhibit.id)
    setEditingExhibit({
      name: exhibit.name,
      galleryId: exhibit.galleryId,
      categoryId: exhibit.categoryId,
      estimatedVisitMinutes: exhibit.estimatedVisitMinutes,
      descriptionEn: exhibit.descriptionEn ?? '',
      descriptionKn: exhibit.descriptionKn ?? '',
      isAvailable: exhibit.isAvailable,
    })
  }

  async function saveExhibit(event, exhibitId) {
    event.preventDefault()
    await runAction(async () => {
      await updateExhibit(accessToken, exhibitId, {
        ...editingExhibit,
        estimatedVisitMinutes: Number(editingExhibit.estimatedVisitMinutes),
      })
      setEditingExhibitId('')
      setEditingExhibit(null)
    }, 'Exhibit details updated.')
  }

  return (
    <>
      <h1>Collection</h1>
      <p className="page-intro">
        Add your museum’s real galleries, interests and bilingual exhibit stories.
        No sample exhibit content is preloaded.
      </p>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      {notice ? <p className="notice notice-success" role="status">{notice}</p> : null}

      <div className="workspace-grid workspace-grid-two">
        <section className="workspace-panel">
          <h2>Galleries</h2>
          <form className="workspace-form" onSubmit={addGallery}>
            <label>
              Gallery name
              <input
                maxLength={120}
                onChange={(event) => setGalleryName(event.target.value)}
                required
                value={galleryName}
              />
            </label>
            <button className="workspace-button" disabled={busy} type="submit">Add gallery</button>
          </form>
          <ResourceList
            items={galleries}
            onRename={(item, name) => runAction(
              () => updateGallery(accessToken, item.id, { name }),
              'Gallery renamed.',
            )}
            onDelete={(item) => removeResource(
              () => deleteGallery(accessToken, item.id),
              item.name,
            )}
          />
        </section>

        <section className="workspace-panel">
          <h2>Interest categories</h2>
          <form className="workspace-form" onSubmit={addCategory}>
            <label>
              Category name
              <input
                maxLength={120}
                onChange={(event) => setCategoryName(event.target.value)}
                required
                value={categoryName}
              />
            </label>
            <button className="workspace-button" disabled={busy} type="submit">Add category</button>
          </form>
          <ResourceList
            items={categories}
            onRename={(item, name) => runAction(
              () => updateCategory(accessToken, item.id, { name }),
              'Category renamed.',
            )}
            onDelete={(item) => removeResource(
              () => deleteCategory(accessToken, item.id),
              item.name,
            )}
          />
        </section>
      </div>

      <section className="workspace-panel" style={{ marginTop: 18 }}>
        <h2>Add an exhibit</h2>
        {galleries.length === 0 || categories.length === 0 ? (
          <p className="notice notice-warning">
            Create at least one gallery and one interest category first.
          </p>
        ) : (
          <form className="workspace-form" onSubmit={addExhibit}>
            <div className="form-row">
              <label>
                Exhibit name
                <input
                  maxLength={160}
                  onChange={(event) => setExhibitForm({ ...exhibitForm, name: event.target.value })}
                  required
                  value={exhibitForm.name}
                />
              </label>
              <label>
                Gallery
                <select
                  onChange={(event) => setExhibitForm({ ...exhibitForm, galleryId: event.target.value })}
                  required
                  value={exhibitForm.galleryId}
                >
                  <option value="">Select a gallery</option>
                  {galleries.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.name}</option>)}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Interest category
                <select
                  onChange={(event) => setExhibitForm({ ...exhibitForm, categoryId: event.target.value })}
                  required
                  value={exhibitForm.categoryId}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label>
                Estimated visit time (minutes)
                <input
                  min="1"
                  onChange={(event) => setExhibitForm({ ...exhibitForm, estimatedVisitMinutes: event.target.value })}
                  required
                  type="number"
                  value={exhibitForm.estimatedVisitMinutes}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                English story
                <textarea
                  onChange={(event) => setExhibitForm({ ...exhibitForm, descriptionEn: event.target.value })}
                  value={exhibitForm.descriptionEn}
                />
              </label>
              <label>
                Kannada story
                <textarea
                  onChange={(event) => setExhibitForm({ ...exhibitForm, descriptionKn: event.target.value })}
                  value={exhibitForm.descriptionKn}
                />
              </label>
            </div>
            <button className="workspace-button" disabled={busy} type="submit">
              {busy ? 'Saving…' : 'Create exhibit'}
            </button>
          </form>
        )}
      </section>

      <section className="workspace-panel" style={{ marginTop: 18 }}>
        <h2>Exhibits</h2>
        {exhibits.length === 0 ? (
          <p className="muted-copy">No exhibits have been added.</p>
        ) : (
          <ul className="workspace-list">
            {exhibits.map((exhibit) => (
              <li className="workspace-list-item" key={exhibit.id}>
                <div>
                  <h3>{exhibit.name}</h3>
                  <p>{exhibit.shortCode} · {exhibit.isAvailable ? 'Available' : 'Unavailable'}</p>
                  <p>{exhibit.descriptionEn || 'English story not provided.'}</p>
                  <p>{exhibit.descriptionKn || 'Kannada story not provided.'}</p>
                  {exhibit.imageUrl ? <img className="story-image" src={exhibit.imageUrl} alt={exhibit.name} /> : null}
                  {exhibit.audioEnUrl ? <audio className="story-audio" controls preload="none" src={exhibit.audioEnUrl} /> : null}
                  {exhibit.audioKnUrl ? <audio className="story-audio" controls preload="none" src={exhibit.audioKnUrl} /> : null}
                  <button className="workspace-button-secondary" onClick={() => beginEditExhibit(exhibit)} type="button">Edit details</button>
                  {editingExhibitId === exhibit.id && editingExhibit ? (
                    <form className="workspace-form" onSubmit={(event) => saveExhibit(event, exhibit.id)}>
                      <label>Exhibit name<input onChange={(event) => setEditingExhibit({ ...editingExhibit, name: event.target.value })} required value={editingExhibit.name} /></label>
                      <div className="form-row">
                        <label>Gallery<select onChange={(event) => setEditingExhibit({ ...editingExhibit, galleryId: event.target.value })} value={editingExhibit.galleryId}>{galleries.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.name}</option>)}</select></label>
                        <label>Category<select onChange={(event) => setEditingExhibit({ ...editingExhibit, categoryId: event.target.value })} value={editingExhibit.categoryId}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                      </div>
                      <label>Estimated visit minutes<input min="1" onChange={(event) => setEditingExhibit({ ...editingExhibit, estimatedVisitMinutes: event.target.value })} type="number" value={editingExhibit.estimatedVisitMinutes} /></label>
                      <label>English story<textarea onChange={(event) => setEditingExhibit({ ...editingExhibit, descriptionEn: event.target.value })} value={editingExhibit.descriptionEn} /></label>
                      <label>Kannada story<textarea onChange={(event) => setEditingExhibit({ ...editingExhibit, descriptionKn: event.target.value })} value={editingExhibit.descriptionKn} /></label>
                      <button className="workspace-button" disabled={busy} type="submit">Save details</button>
                    </form>
                  ) : null}
                  <form className="workspace-form" onSubmit={(event) => uploadMedia(event, exhibit.id)}>
                    <div className="form-row">
                      <label>Exhibit image<input accept="image/jpeg,image/png,image/webp" onChange={(event) => setMediaFiles({ ...mediaFiles, [exhibit.id]: { ...mediaFiles[exhibit.id], image: event.target.files?.[0] } })} type="file" /></label>
                      <label>English audio<input accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4" onChange={(event) => setMediaFiles({ ...mediaFiles, [exhibit.id]: { ...mediaFiles[exhibit.id], audioEn: event.target.files?.[0] } })} type="file" /></label>
                      <label>Kannada audio<input accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4" onChange={(event) => setMediaFiles({ ...mediaFiles, [exhibit.id]: { ...mediaFiles[exhibit.id], audioKn: event.target.files?.[0] } })} type="file" /></label>
                    </div>
                    <button className="workspace-button-secondary" disabled={busy} type="submit">Upload selected media</button>
                  </form>
                  <button
                    className="workspace-button-secondary"
                    disabled={busy}
                    onClick={() => changeAvailability(exhibit)}
                    type="button"
                  >
                    Mark {exhibit.isAvailable ? 'unavailable' : 'available'}
                  </button>
                  <button
                    className="workspace-button-danger"
                    onClick={() => removeResource(
                      () => deleteExhibit(accessToken, exhibit.id),
                      exhibit.name,
                    )}
                    type="button"
                  >
                    Delete exhibit
                  </button>
                  <QRCodeImage value={exhibit.shortCode} label={`QR code for ${exhibit.name}`} size={128} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function ResourceList({ items, onDelete, onRename }) {
  const [editingId, setEditingId] = useState('')
  const [name, setName] = useState('')
  if (items.length === 0) {
    return <p className="muted-copy">Nothing added yet.</p>
  }
  return (
    <ul className="workspace-list">
      {items.map((item) => (
        <li className="workspace-list-item" key={item.id}>
          <div>
            <h3>{item.name}</h3>
            {editingId === item.id ? (
              <form className="workspace-form" onSubmit={(event) => {
                event.preventDefault()
                onRename(item, name)
                setEditingId('')
              }}>
                <input aria-label={`New name for ${item.name}`} onChange={(event) => setName(event.target.value)} required value={name} />
                <button className="workspace-button-secondary" type="submit">Save name</button>
              </form>
            ) : null}
          </div>
          <div className="visitor-actions">
            {onRename ? <button className="workspace-button-secondary" onClick={() => { setEditingId(item.id); setName(item.name) }} type="button">Rename</button> : null}
            <button className="workspace-button-danger" onClick={() => onDelete(item)} type="button">Delete</button>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default CuratorCollection
