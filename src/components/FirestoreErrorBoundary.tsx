import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class FirestoreErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิดในระบบฐานข้อมูล',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Sanctuary ErrorBoundary caught:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#1C1F24] text-[#F4EFE6] flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-xl border border-[#D4A359]/40 bg-[#2A2E35] p-6 space-y-4">
            <h2 className="font-display text-xl text-[#D4A359] font-semibold">
              กุฏิอารามสะดุดชั่วคราว
            </h2>
            <p className="text-sm text-[#C0C5CE] leading-relaxed">
              ระบบตรวจพบปัญหาการเชื่อมต่อข้อมูลหรือสิทธิ์เข้าถึง คุณสามารถรีเฟรชหน้าเพื่อเริ่มต้นใหม่ได้อย่างปลอดภัย
            </p>
            <div className="rounded-lg bg-[#1C1F24] p-3 text-xs text-rose-200 break-words">
              {this.state.errorMessage}
            </div>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="min-h-[44px] px-5 py-2 rounded-lg bg-[#D4A359] text-[#1C1F24] text-xs font-semibold"
            >
              รีโหลดหน้านี้
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
