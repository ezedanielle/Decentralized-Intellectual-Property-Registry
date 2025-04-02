;; Creation Registration Contract
;; Records details of original works

;; Define data variables
(define-data-var contract-owner principal tx-sender)
(define-map creations
  { creation-id: (string-utf8 36) }
  {
    creator: principal,
    title: (string-utf8 100),
    description: (string-utf8 500),
    content-hash: (buff 32),
    timestamp: uint,
    category: (string-utf8 50)
  }
)

(define-map creation-ids-by-creator
  { creator: principal }
  { ids: (list 100 (string-utf8 36)) }
)

;; Error codes
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_ALREADY_REGISTERED (err u101))
(define-constant ERR_NOT_FOUND (err u102))

;; Read-only functions
(define-read-only (get-creation (creation-id (string-utf8 36)))
  (map-get? creations { creation-id: creation-id })
)

(define-read-only (get-creations-by-creator (creator principal))
  (default-to { ids: (list) } (map-get? creation-ids-by-creator { creator: creator }))
)

;; Public functions
(define-public (register-creation
    (creation-id (string-utf8 36))
    (title (string-utf8 100))
    (description (string-utf8 500))
    (content-hash (buff 32))
    (category (string-utf8 50)))

  (let ((existing-creation (get-creation creation-id))
        (creator-ids (get-creations-by-creator tx-sender)))

    ;; Check if creation already exists
    (asserts! (is-none existing-creation) ERR_ALREADY_REGISTERED)

    ;; Insert the creation
    (map-set creations
      { creation-id: creation-id }
      {
        creator: tx-sender,
        title: title,
        description: description,
        content-hash: content-hash,
        timestamp: block-height,
        category: category
      }
    )

    ;; Update the creator's list of creation IDs
    (map-set creation-ids-by-creator
      { creator: tx-sender }
      { ids: (unwrap! (as-max-len?
                        (append (get ids creator-ids) creation-id)
                        u100)
                      ERR_NOT_AUTHORIZED) }
    )

    (ok creation-id)
  )
)

(define-public (update-creation-details
    (creation-id (string-utf8 36))
    (title (string-utf8 100))
    (description (string-utf8 500))
    (category (string-utf8 50)))

  (let ((existing-creation (unwrap! (get-creation creation-id) ERR_NOT_FOUND)))

    ;; Check if sender is the creator
    (asserts! (is-eq tx-sender (get creator existing-creation)) ERR_NOT_AUTHORIZED)

    ;; Update the creation details
    (map-set creations
      { creation-id: creation-id }
      (merge existing-creation {
        title: title,
        description: description,
        category: category
      })
    )

    (ok true)
  )
)

