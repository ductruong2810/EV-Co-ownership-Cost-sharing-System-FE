import { Modal } from 'antd'
import CheckLicense from './CheckLicense'

interface CheckLicenseModalProps {
  open: boolean
  onClose: () => void
}

export default function CheckLicenseModal({ open, onClose }: CheckLicenseModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width='98vw'
      style={{ 
        top: 10,
        maxWidth: '1600px'
      }}
      className='check-license-modal'
      styles={{
        body: {
          padding: 0,
          maxHeight: 'calc(100vh - 60px)',
          overflowY: 'auto',
          overflowX: 'hidden'
        },
        content: {
          padding: 0
        }
      }}
      destroyOnClose={true}
      maskClosable={false}
      closable={true}
    >
      <CheckLicense onClose={onClose} />
    </Modal>
  )
}

