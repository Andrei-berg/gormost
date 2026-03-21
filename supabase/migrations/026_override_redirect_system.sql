
  Блок 1 — завершить все заявки (requests):
  UPDATE requests
  SET status = 'DONE'
  WHERE status != 'DONE';

  Блок 2 — завершить все планы работ (work_plans):
  UPDATE work_plans
  SET
    status = 'DONE',
    completed_at = NOW(),
    fact_finish = NOW()
  WHERE status != 'DONE';

  Откат (если что-то пошло не так):
  -- Вернуть заявки в IN_PROGRESS
  UPDATE requests SET status = 'IN_PROGRESS' WHERE status = 'DONE';

  -- Вернуть планы в ASSIGNED
  UPDATE work_plans SET status = 'ASSIGNED', completed_at = NULL, fact_finish = NULL WHERE status = 'DONE';

